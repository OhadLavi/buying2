from pathlib import Path
import sys
from pathlib import Path as PathLib

# Add parent directory to path so we can import app
sys.path.insert(0, str(PathLib(__file__).parent.parent))

from app import extract_items


FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_extract_deal4real_parsing_and_dedupe():
    html = load("deal4real.html")
    items = extract_items(html, "https://deal4real.co.il/", ".product-card", source_id="deal4real")
    assert len(items) == 1
    item = items[0]
    assert item["title"].startswith("Amazing Vacuum Cleaner")
    assert item["link"].startswith("https://deal4real.co.il/")
    assert item["price"].startswith("₪")


def test_extract_zuzu_price_regex():
    html = load("zuzu.html")
    items = extract_items(html, "https://zuzu.deals/", ".col_item", source_id="zuzu")
    assert items and items[0]["price"] == "$199.99"


def test_extract_buywithus_relative_link_and_price():
    html = load("buywithus.html")
    items = extract_items(html, "https://buywithus.org/", ".col_item", source_id="buywithus")
    assert items
    it = items[0]
    assert it["link"].startswith("https://buywithus.org/")
    assert it["price"] == "€49.90"


if __name__ == "__main__":
    import sys
    
    print("Running tests...")
    passed = 0
    failed = 0
    
    try:
        test_extract_deal4real_parsing_and_dedupe()
        print("✓ test_extract_deal4real_parsing_and_dedupe passed")
        passed += 1
    except Exception as e:
        print(f"✗ test_extract_deal4real_parsing_and_dedupe failed: {e}")
        failed += 1
    
    try:
        test_extract_zuzu_price_regex()
        print("✓ test_extract_zuzu_price_regex passed")
        passed += 1
    except Exception as e:
        print(f"✗ test_extract_zuzu_price_regex failed: {e}")
        failed += 1
    
    try:
        test_extract_buywithus_relative_link_and_price()
        print("✓ test_extract_buywithus_relative_link_and_price passed")
        passed += 1
    except Exception as e:
        print(f"✗ test_extract_buywithus_relative_link_and_price failed: {e}")
        failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)






