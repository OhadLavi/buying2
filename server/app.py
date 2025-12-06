"""
Single-file FastAPI Deals Aggregator Server
Scrapes deals from deal4real.co.il, zuzu.deals, and buywithus.org
"""
import asyncio
import logging
import os
import re
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from cachetools import TTLCache
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

# ============================================================================
# FIX: Python 3.13 on Windows requires ProactorEventLoop for subprocess
# CRITICAL: This MUST be set before any event loop is created
# ============================================================================
if sys.platform == "win32":
    if sys.version_info >= (3, 8):
        try:
            # For Python 3.8+ on Windows, use WindowsSelectorEventLoop or ProactorEventLoop
            # Python 3.13 requires ProactorEventLoop for subprocess support
            if sys.version_info >= (3, 13):
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            else:
                # For older versions, try ProactorEventLoop too (safer for subprocess)
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        except (AttributeError, RuntimeError) as e:
            print(f"Warning: Could not set event loop policy: {e}")

# ============================================================================
# LOGGING
# ============================================================================
logger = logging.getLogger("deals")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ============================================================================
# CONFIGURATION
# ============================================================================
DESKTOP_CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
)

SOURCE_MAP: Dict[str, Dict[str, str]] = {
    "deal4real": {"url": "https://deal4real.co.il/", "selector": ".product-card-wrapper .product-card, .product-card"},
    "zuzu": {"url": "https://zuzu.deals/", "selector": ".col_item"},
    "buywithus": {"url": "https://buywithus.org/", "selector": ".col_item"},
    "beedeals": {"url": "https://il.bee.deals/dashboard", "selector": ".pin.nfDealItemsPin"},
}

WHITELIST_HOSTS = {
    "deal4real.co.il",
    "www.deal4real.co.il",
    "zuzu.deals",
    "www.zuzu.deals",
    "buywithus.org",
    "www.buywithus.org",
    "il.bee.deals",
    "www.il.bee.deals",
}

price_regex = re.compile(r"(?:₪|\$|€)?\s?\d[\d,\.]*")

# Cache: TTL 60s (1 minute) - reduced for faster updates
_cache: TTLCache = TTLCache(maxsize=64, ttl=60)

# ============================================================================
# DATA MODEL
# ============================================================================
@dataclass
class DealItem:
    title: Optional[str]
    link: Optional[str]
    price: Optional[str]
    image: Optional[str]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()

def is_allowed_host(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
        return host in WHITELIST_HOSTS
    except Exception:
        return False

def resolve_url(base_url: str, href: str, allow_external: bool = False) -> Optional[str]:
    """Resolve a URL to absolute form.
    
    Args:
        base_url: Base URL to resolve against
        href: Relative or absolute URL
        allow_external: If True, allow external hosts (for images/CDN)
    """
    if not href:
        return None
    
    # If already absolute and external, check if allowed
    if href.startswith(('http://', 'https://')):
        if allow_external:
            return href  # Allow external URLs for images (CDN, Amazon, etc.)
        return href if is_allowed_host(href) else None
    
    # Join with base URL
    absolute = urljoin(base_url, href)
    
    if allow_external:
        return absolute  # Allow external URLs for images
    return absolute if is_allowed_host(absolute) else None

def extract_price_text(root, source_id: Optional[str] = None) -> Optional[str]:
    price_text = None
    original_price = None
    
    # For deal4real: price is in .product-pricing-wrapper > div containing "מחיר:"
    if source_id == "deal4real":
        pricing_wrapper = root.select_one(".product-pricing-wrapper")
        if pricing_wrapper:
            # Find discount percentage first (ירידה:)
            discount_text = None
            price_text = None
            price_divs = pricing_wrapper.find_all("div")
            for div in price_divs:
                div_text = div.get_text()
                if "ירידה:" in div_text or "discount" in div_text.lower():
                    # Extract percentage
                    percent_match = re.search(r'(\d+\.?\d*%)', div_text)
                    if percent_match:
                        discount_text = percent_match.group(1)
                elif "מחיר קודם:" in div_text or "מחיר קודם" in div_text or "previous price" in div_text.lower():
                    # Extract original price (usually in a span with line-through)
                    span_el = div.find("span")
                    if span_el:
                        span_text = span_el.get_text(strip=True)
                        # Extract price that starts with currency symbol
                        price_match = re.search(r'(?:₪|\$|€)\s?\d[\d,\.]*', span_text)
                        if price_match:
                            original_price = price_match.group(0).strip()
                    # Fallback to div text
                    if not original_price:
                        price_match = re.search(r'(?:₪|\$|€)\s?\d[\d,\.]*', div_text)
                        if price_match:
                            original_price = price_match.group(0).strip()
                elif "מחיר:" in div_text:
                    # Look specifically in the span within this div
                    span_el = div.find("span")
                    if span_el:
                        span_text = span_el.get_text(strip=True)
                        # Extract price that starts with currency symbol (₪, $, €) to avoid matching random numbers
                        # Prefer the first price found (usually ₪)
                        price_matches = re.findall(r'(?:₪|\$|€)\s?\d[\d,\.]*', span_text)
                        if price_matches:
                            price_text = price_matches[0].strip()
                    # Fallback to div text if no span
                    if not price_text:
                        # Extract price that starts with currency symbol
                        price_match = re.search(r'(?:₪|\$|€)\s?\d[\d,\.]*', div_text)
                        if price_match:
                            price_text = price_match.group(0).strip()
            
            # Format: current_price (original_price) if both exist, or current_price (discount%) if discount exists
            if price_text and original_price:
                price_text = f"{price_text} ({original_price})"
            elif price_text and discount_text:
                price_text = f"{price_text} ({discount_text})"
            elif discount_text and not price_text:
                price_text = discount_text
    
    # For zuzu: check .rh_regular_price or .price_count
    if not price_text and source_id == "zuzu":
        price_elem = root.select_one(".rh_regular_price") or root.select_one(".price_count")
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            # If it's a percentage or contains %, show as is
            if "%" in price_text:
                return price_text
            # Otherwise try to extract numeric price
            price_match = price_regex.search(price_text)
            if price_match:
                price_text = price_match.group(0).strip()
    
    # For buywithus: check .rh_regular_price in .price_for_grid and include percentage/discount
    if not price_text and source_id == "buywithus":
        price_elem = root.select_one(".price_for_grid .rh_regular_price") or root.select_one(".rh_regular_price")
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            price_match = price_regex.search(price_text)
            if price_match:
                extracted_price = price_match.group(0).strip()
                # Check if there's percentage info nearby (like in re-ribbon-badge or discount indicators)
                # Look for percentage badges or discount indicators
                discount_badge = root.select_one(".re-ribbon-badge, .badge, [class*='discount'], [class*='percent']")
                if discount_badge:
                    badge_text = discount_badge.get_text(strip=True)
                    # If badge contains %, append it
                    if "%" in badge_text:
                        price_text = f"{extracted_price} ({badge_text})"
                    else:
                        price_text = extracted_price
                else:
                    price_text = extracted_price
            # If it's already a percentage or contains %, show as is
            elif "%" in price_text:
                pass  # Keep as is
            else:
                price_text = None
    
    # Fallback: generic price extraction - but ONLY if we haven't found anything yet
    # AND make sure we require currency symbol to avoid matching random numbers
    if not price_text:
        price_elem = None
        # First try exact .price class
        price_elem = root.select_one(".price")
        if not price_elem:
            # Then try case-insensitive search
            for elem in root.find_all(True):
                class_attr = elem.get("class", [])
                if class_attr:
                    class_str = " ".join(class_attr).lower()
                    if "price" in class_str:
                        price_elem = elem
                        break
        
        text = None
        if price_elem and price_elem.get_text(strip=True):
            text = price_elem.get_text(" ", strip=True)
        if not text:
            # fallback to root text if price not found
            text = root.get_text(" ", strip=True)
        if text:
            # CRITICAL: Only match prices that START with currency symbol to avoid "7" from "Black-7"
            m = re.search(r'(?:₪|\$|€)\s?\d[\d,\.]*', text)
            if m:
                price_text = m.group(0).strip()
    
    return price_text

def extract_items(html: str, base_url: str, selector: str, source_id: Optional[str] = None) -> List[Dict[str, Optional[str]]]:
    soup = BeautifulSoup(html or "", "lxml")
    nodes = soup.select(selector)
    items: List[DealItem] = []
    seen_keys = set()
    
    for node in nodes:
        # Title extraction with improved logic
        title_el = None
        title = None
        
        # For deal4real, try multiple strategies
        if source_id == "deal4real":
            # Strategy 1: Try specific product title classes and data attributes
            for title_selector in [
                ".product-title", ".title", ".product-name", ".name",
                "[data-title]", "[data-product-title]", "[data-name]",
                "h2.title", "h3.title", ".card-title", ".item-title"
            ]:
                title_el = node.select_one(title_selector)
                if title_el:
                    candidate = normalize_whitespace(title_el.get_text())
                    # Skip if it's just numbers
                    candidate_clean = re.sub(r'[\s\.,\-_]+', '', candidate)
                    if candidate and not re.match(r'^\d+$', candidate_clean) and len(candidate) > 3:
                        title = candidate
                        break
            
            # Strategy 2: Try image alt text (often contains product name)
            if not title:
                img_el = node.find("img")
                if img_el and img_el.get("alt"):
                    alt_text = normalize_whitespace(img_el.get("alt"))
                    alt_clean = re.sub(r'[\s\.,\-_]+', '', alt_text)
                    if alt_text and not re.match(r'^\d+$', alt_clean) and len(alt_text) > 3:
                        title = alt_text
            
            # Strategy 3: Try h1/h2/h3 but filter aggressively
            if not title:
                for tag in ["h1", "h2", "h3"]:
                    title_el = node.find(tag)
                    if title_el:
                        candidate = normalize_whitespace(title_el.get_text())
                        candidate_clean = re.sub(r'[\s\.,\-_]+', '', candidate)
                        if candidate and not re.match(r'^\d+$', candidate_clean) and len(candidate) > 3:
                            title = candidate
                            break
        
        # For beedeals: title is in .pinMenuCenter span.ng-binding or bo-text attribute
        if not title and source_id == "beedeals":
            pin_menu_center = node.select_one(".pinMenuCenter")
            if pin_menu_center:
                # Try span with ng-binding class
                title_span = pin_menu_center.find("span", class_="ng-binding")
                if title_span:
                    title = normalize_whitespace(title_span.get_text())
                # Also try any span in pinMenuCenter
                if not title:
                    all_spans = pin_menu_center.find_all("span")
                    for span in all_spans:
                        span_text = normalize_whitespace(span.get_text())
                        if span_text and len(span_text) > 3:
                            title = span_text
                            break
                # Also try bo-text attribute if present
                if not title:
                    bo_text = pin_menu_center.get("bo-text")
                    if bo_text:
                        title = normalize_whitespace(bo_text)
                # Fallback: get all text from pinMenuCenter
                if not title:
                    all_text = normalize_whitespace(pin_menu_center.get_text())
                    if all_text and len(all_text) > 3:
                        title = all_text
        
        # Standard approach for other sources or if deal4real didn't find anything
        if not title:
            # Try h1/h2/h3
            for tag in ["h1", "h2", "h3"]:
                title_el = node.find(tag)
                if title_el:
                    title = normalize_whitespace(title_el.get_text())
                    break
            
            # Try other heading elements or strong/bold text
            if not title:
                title_el = node.find(["h4", "h5", "h6", "strong", "b"])
                if title_el:
                    title = normalize_whitespace(title_el.get_text())
            
            # Try first link text (but avoid link text that looks like price/number)
            if not title:
                link_elem = node.find("a", href=True)
                if link_elem:
                    link_text = link_elem.get_text(strip=True)
                    # Skip if link text is just numbers or looks like a price
                    if link_text and not re.match(r'^\d+[\d,\.\s]*$', link_text) and link_text.lower() not in ['view', 'open', 'קנה', 'רכוש', 'לפרטים']:
                        title = normalize_whitespace(link_text)
            
            # Try first paragraph
            if not title:
                title_el = node.find("p")
                if title_el:
                    title = normalize_whitespace(title_el.get_text())
            
            # Last resort: use full element text but filter intelligently
            if not title:
                title_text = node.get_text(" ", strip=True)
                if title_text:
                    # Remove price pattern from title if found
                    title_text = re.sub(r"(?:₪|\$|€)?\s?\d[\d,\.]*", "", title_text).strip()
                    if title_text:
                        title = normalize_whitespace(title_text)
        
        # Final filter: reject titles that are only numbers
        if title:
            title_clean = re.sub(r'[\s\.,\-_]+', '', title)
            if re.match(r'^\d+$', title_clean) or len(title.strip()) < 3:
                title = None
        
        # Remove common prefixes from title: "רק ב" and "החל מ"
        if title:
            # Remove "רק ב" and variations (with optional price pattern after)
            title = re.sub(r'^\s*רק\s+ב\s*[-:]?\s*(?:₪|\$|€)?\s*', '', title, flags=re.IGNORECASE)
            # Remove "החל מ" and variations (with optional price pattern after)
            title = re.sub(r'^\s*החל\s+מ\s*[-:]?\s*(?:₪|\$|€)?\s*', '', title, flags=re.IGNORECASE)
            # Remove "רק" at the start if followed by price or space
            title = re.sub(r'^\s*רק\s+(?:₪|\$|€)?\s*', '', title, flags=re.IGNORECASE)
            title = normalize_whitespace(title)
        
        # Extract price first, then clean any prices from title
        price = None  # Initialize price variable
        
        # For beedeals: price is in .pinPrice span text
        if source_id == "beedeals":
            pin_price = node.select_one(".pinPrice")
            if pin_price:
                price_link = pin_price.find("a")
                if price_link:
                    price_text = normalize_whitespace(price_link.get_text())
                    # Filter out invalid prices like "$0.0" or "0.0"
                    if price_text and price_text not in ["$0.0", "$0", "0.0", "0", "₪0", "€0"]:
                        # Extract price pattern from text
                        price_match = re.search(r'(?:₪|\$|€|USD|ILS)?\s?\d[\d,\.]+', price_text)
                        if price_match:
                            price = price_match.group(0).strip()
                        elif price_text and len(price_text) > 2:  # Only use if it's a meaningful price string
                            price = price_text
            # Fallback to standard extraction if beedeals-specific extraction didn't work
            if not price:
                price = extract_price_text(node, source_id=source_id)
        else:
            # For all other sources, use standard price extraction
            price = extract_price_text(node, source_id=source_id)
        
        # If price is just a single digit without currency, it's likely wrong (e.g., "7" from "Black-7")
        if price and len(price.strip()) == 1 and price.strip().isdigit():
            price = None
        
        # Extract any remaining prices from title and move them to price field if price is not set
        if title and not price:
            # Look for price patterns in title
            price_match = re.search(r'(?:₪|\$|€)\s?\d[\d,\.]*', title)
            if price_match:
                extracted_price = price_match.group(0).strip()
                # Check if it's not part of a larger word
                match_start = price_match.start()
                match_end = price_match.end()
                # Only extract if surrounded by spaces/punctuation or at start/end
                if (match_start == 0 or not re.match(r'\w', title[match_start-1:match_start])) and \
                   (match_end == len(title) or not re.match(r'\w', title[match_end:match_end+1])):
                    price = extracted_price
                    # Remove from title
                    title = re.sub(re.escape(extracted_price), "", title).strip()
                    title = normalize_whitespace(title)
        
        if price and title:
            # Remove price pattern from title (in case it wasn't caught above)
            # Remove full price strings from title
            title = re.sub(r'(?:₪|\$|€)\s?\d[\d,\.]*\s*\([^)]*\)', "", title).strip()  # Remove "₪92 ($56)"
            title = re.sub(r'(?:₪|\$|€)\s?\d[\d,\.]*', "", title).strip()  # Remove simple prices
            title = normalize_whitespace(title)

        # Extract image URL - source-specific extraction
        image = None
        
        # For deal4real: images are in .product-image-wrapper > img.product-image
        # The structure is: .product-card-wrapper > .product-card > .product-image-wrapper > img.product-image
        if source_id == "deal4real":
            # Direct approach: find image wrapper within current node
            image_wrapper = node.select_one(".product-image-wrapper")
            
            # If not found in current node, the node might be nested - check within it recursively
            if not image_wrapper:
                # Try finding all image wrappers in descendants
                all_wrappers = node.select(".product-image-wrapper")
                if all_wrappers:
                    image_wrapper = all_wrappers[0]
            
            # Also check parent elements (in case node is .product-card inside .product-card-wrapper)
            if not image_wrapper:
                for parent in node.parents:
                    if hasattr(parent, 'select_one'):
                        image_wrapper = parent.select_one(".product-image-wrapper")
                        if image_wrapper:
                            break
            
            if image_wrapper:
                # Try to find img with class product-image (exact match)
                img_classes = image_wrapper.find_all("img")
                img_el = None
                for img in img_classes:
                    img_class_attr = img.get("class", [])
                    if isinstance(img_class_attr, list) and "product-image" in img_class_attr:
                        img_el = img
                        break
                    elif isinstance(img_class_attr, str) and "product-image" in img_class_attr:
                        img_el = img
                        break
                
                # Fallback to any img in the wrapper
                if not img_el:
                    img_el = image_wrapper.find("img")
                
                if img_el:
                    img_src = img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazy-src")
                    if img_src and img_src.strip() and not img_src.startswith("data:"):
                        # Allow external URLs for images (e.g., Amazon CDN)
                        image = resolve_url(base_url, img_src, allow_external=True)
                        logger.debug(f"deal4real image extracted: {image} from src={img_src}")
        
        # For beedeals: images are in .image_holder > img with bo-src-i or src
        if not image and source_id == "beedeals":
            image_holder = node.select_one(".image_holder")
            if image_holder:
                img_el = image_holder.find("img")
                if img_el:
                    # Try bo-src-i attribute first (bindonce directive), then src
                    img_src = img_el.get("bo-src-i") or img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazy-src")
                    if img_src and img_src.strip() and not img_src.startswith("data:"):
                        image = resolve_url(base_url, img_src, allow_external=True)
                        logger.debug(f"beedeals image extracted: {image} from src={img_src}")
        
        # For zuzu and buywithus: images are in figure > a > img
        if not image and source_id in ["zuzu", "buywithus"]:
            figure_el = node.find("figure")
            if figure_el:
                a_el = figure_el.find("a")
                if a_el:
                    img_el = a_el.find("img")
                    if img_el:
                        # Try src first (usually present), then data-src (lazy loading)
                        img_src = img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazy-src")
                        if img_src and img_src.strip() and not img_src.startswith("data:"):
                            # Allow external URLs for images (e.g., CDN URLs)
                            image = resolve_url(base_url, img_src, allow_external=True)
                            logger.debug(f"{source_id} image extracted from src: {image}")
                        # Also check srcset for better quality image if src not found or empty
                        if not image or not image.strip():
                            srcset = img_el.get("srcset")
                            if srcset:
                                # Extract first src from srcset (format: "url width" or "url")
                                srcset_match = re.search(r'^([^\s,]+)', srcset)
                                if srcset_match:
                                    potential_src = srcset_match.group(1)
                                    if not potential_src.startswith("data:") and potential_src.strip():
                                        image = resolve_url(base_url, potential_src, allow_external=True)
                                        logger.debug(f"{source_id} image extracted from srcset: {image}")
        
        # Fallback: try to find any img tag in the node
        if not image:
            img_el = node.find("img")
            if img_el:
                # Try src first
                img_src = img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazy-src")
                if img_src and img_src.strip() and not img_src.startswith("data:"):
                    image = resolve_url(base_url, img_src, allow_external=True)
                # If no valid image, try background-image in style attribute
                if not image:
                    style_attr = img_el.get("style") or ""
                    bg_match = re.search(r'url\(["\']?([^"\']+)["\']?\)', style_attr)
                    if bg_match:
                        image = resolve_url(base_url, bg_match.group(1), allow_external=True)
        
        # Try to find image in parent elements if not found in node directly
        if not image:
            for parent in node.parents:
                if hasattr(parent, 'find'):
                    parent_img = parent.find("img")
                    if parent_img:
                        img_src = parent_img.get("src") or parent_img.get("data-src") or parent_img.get("data-lazy-src")
                        if img_src and img_src.strip() and not img_src.startswith("data:"):
                            image = resolve_url(base_url, img_src, allow_external=True)
                            break

        # Link extraction - source-specific
        link = None
        
        # For beedeals: link is in .pinPrice a with bo-href or href, or construct from ng-click
        if source_id == "beedeals":
            pin_price_a = node.select_one(".pinPrice a")
            if pin_price_a:
                link_href = pin_price_a.get("bo-href") or pin_price_a.get("href")
                if link_href:
                    link = resolve_url(base_url, link_href, allow_external=True)
            # Fallback: try to get link from any a tag with go.php
            if not link:
                all_links = node.find_all("a", href=True)
                for link_el in all_links:
                    link_href = link_el.get("href") or link_el.get("bo-href")
                    if link_href and ("go.php" in link_href or "bee.deals" in link_href):
                        link = resolve_url(base_url, link_href, allow_external=True)
                        break
            # Another fallback: construct from topHolder ng-click which has alphaId
            if not link:
                top_holder = node.select_one(".topHolder")
                if top_holder:
                    ng_click = top_holder.get("ng-click")
                    if ng_click and "alphaId" in ng_click:
                        # Try to find any href in the node
                        link_el = node.find("a", href=True)
                        if link_el:
                            link_href = link_el.get("href")
                            if link_href:
                                link = resolve_url(base_url, link_href, allow_external=True)
        
        # Standard approach for other sources
        if not link:
            link_el = node.find("a", href=True)
            link = resolve_url(base_url, link_el["href"]) if link_el else None

        # drop items where all fields are null
        # For beedeals, require at least title or link (price is optional)
        if source_id == "beedeals":
            if not title and not link:
                continue
        else:
            if not any([title, link, price]):
                continue

        # dedupe by canonical link or normalized title
        dedupe_key = link or (title.lower() if title else None)
        if not dedupe_key or dedupe_key in seen_keys:
            if dedupe_key in seen_keys:
                continue
        seen_keys.add(dedupe_key)
        items.append(DealItem(title=title, link=link, price=price, image=image))

    return [
        {"title": it.title, "link": it.link, "price": it.price, "image": it.image}
        for it in items
    ]

# ============================================================================
# PLAYWRIGHT SCRAPING
# ============================================================================
async def fetch_page_html(context, url: str, selector: Optional[str] = None) -> str:
    page = await context.new_page()
    try:
        # For beedeals (AngularJS app), wait for network to be idle and content to load
        if "bee.deals" in url:
            await page.goto(url, wait_until="networkidle", timeout=60000)
            # Wait for AngularJS to render the pins
            try:
                await page.wait_for_selector(".pin.nfDealItemsPin, .pin", timeout=10000)
                # Give AngularJS a bit more time to fully render
                await page.wait_for_timeout(2000)
            except Exception:
                logger.warning("beedeals: Timeout waiting for pins, continuing anyway")
        else:
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            if selector:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                except Exception:
                    pass  # best-effort only
        html = await page.content()
        return html
    finally:
        await page.close()

async def scrape_source(context, source_id: str) -> List[Dict[str, Optional[str]]]:
    if source_id not in SOURCE_MAP:
        return []
    
    cache_key = f"src:{source_id}"
    if cache_key in _cache:
        return _cache[cache_key]

    meta = SOURCE_MAP[source_id]
    url = meta["url"]
    selector = meta["selector"]
    try:
        html = await fetch_page_html(context, url, selector)
        items = extract_items(html, url, selector, source_id=source_id)
        logger.info(f"{source_id}: Extracted {len(items)} items")
        if source_id == "beedeals" and len(items) == 0:
            # Debug: check if selector found any nodes
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html or "", "lxml")
            nodes = soup.select(selector)
            logger.warning(f"beedeals: Found {len(nodes)} nodes with selector '{selector}', but extracted 0 items")
            if len(nodes) > 0:
                # Log first node structure for debugging
                logger.debug(f"beedeals: First node HTML snippet: {str(nodes[0])[:500]}")
    except Exception as e:
        logger.error(f"{source_id}: Scraping failed: {e}", exc_info=True)
        items = []

    _cache[cache_key] = items
    return items

# ============================================================================
# FASTAPI APP LIFECYCLE
# ============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from playwright.async_api import async_playwright

    logger.info("Launching Chromium...")
    try:
        app.state.playwright = await async_playwright().start()
        chromium = app.state.playwright.chromium
        app.state.browser = await chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        app.state.context = await app.state.browser.new_context(user_agent=DESKTOP_CHROME_UA)
        logger.info("Chromium launched successfully")
    except Exception as e:
        logger.error("Failed to launch Chromium: %s", e)
        raise

    yield

    # Shutdown
    logger.info("Shutting down Chromium...")
    try:
        if app.state.context:
            await app.state.context.close()
        if app.state.browser:
            await app.state.browser.close()
        if app.state.playwright:
            await app.state.playwright.stop()
    except Exception as e:
        logger.warning("Error during shutdown: %s", e)
    logger.info("Chromium shutdown complete")

# ============================================================================
# FASTAPI APP
# ============================================================================
app = FastAPI(lifespan=lifespan)

# CORS configuration
cors_env = os.getenv("CORS_ORIGINS")
if cors_env:
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]
else:
    origins = ["*"]  # Development default

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# ROUTES
# ============================================================================
@app.get("/")
async def health() -> Dict[str, bool]:
    """Health check endpoint"""
    return {"ok": True}

@app.post("/clear-cache")
async def clear_cache() -> Dict[str, bool]:
    """Clear the cache to force fresh scraping"""
    _cache.clear()
    logger.info("Cache cleared")
    return {"ok": True}

@app.get("/scrape")
async def scrape(sources: str = Query("deal4real,zuzu,buywithus")) -> Dict[str, List[dict]]:
    """Scrape deals from specified sources"""
    requested = [s.strip() for s in sources.split(",") if s.strip()]
    allowed = [s for s in requested if s in SOURCE_MAP.keys()]
    logger.info("/scrape requested sources=%s", ",".join(allowed))

    results: Dict[str, List[dict]] = {s: [] for s in allowed}

    async def run_one(src: str):
        try:
            items = await asyncio.wait_for(
                scrape_source(app.state.context, src), timeout=70
            )
            results[src] = items
        except Exception as e:
            is_production = os.getenv("ENVIRONMENT") == "production"
            if is_production:
                logger.warning("source %s failed: %s", src, type(e).__name__)
            else:
                logger.warning("source %s failed: %s", src, e)
            results[src] = []

    await asyncio.gather(*(run_one(s) for s in allowed))
    return results

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    
    # Run without reload to avoid event loop issues
    # For development with reload, use: uvicorn app:app --reload-dir . --host 0.0.0.0 --port 3001
    uvicorn.run(
        app,  # Pass the app instance directly, not the string
        host="0.0.0.0",
        port=3001,
        reload=False  # Disable reload to ensure event loop policy works
    )

