from pathlib import Path

from server.scraper import extract_items


FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_extract_deal4real_parsing_and_dedupe():
    html = load("deal4real.html")
    items = extract_items(html, "https://deal4real.co.il/", ".product-card")
    assert len(items) == 1
    item = items[0]
    assert item["title"].startswith("Amazing Vacuum Cleaner")
    assert item["link"].startswith("https://deal4real.co.il/")
    assert item["price"].startswith("₪")


def test_extract_zuzu_price_regex():
    html = load("zuzu.html")
    items = extract_items(html, "https://zuzu.deals/", ".col_item")
    assert items and items[0]["price"] == "$199.99"


def test_extract_buywithus_relative_link_and_price():
    html = load("buywithus.html")
    items = extract_items(html, "https://buywithus.org/", ".col_item")
    assert items
    it = items[0]
    assert it["link"].startswith("https://buywithus.org/")
    assert it["price"] == "€49.90"




