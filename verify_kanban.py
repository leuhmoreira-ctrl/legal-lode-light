from playwright.sync_api import sync_playwright

def verify_kanban():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to Kanban...")
            page.goto("http://localhost:3000/kanban")
            # Wait a bit for potential redirects or loading
            page.wait_for_timeout(5000)

            # Check title or something
            title = page.title()
            print(f"Page title: {title}")

            # Take screenshot
            page.screenshot(path="verification.png")
            print("Screenshot saved to verification.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_kanban()
