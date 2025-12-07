from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to local preview
        page.goto("http://localhost:4173")

        # Wait for Lock Screen
        page.wait_for_selector("text=Security Check")

        # Enter PIN "1234"
        # The inputs have class .pin-digit and data-idx 0,1,2,3
        # However, looking at the code, they auto-advance. I should type into them one by one.

        inputs = page.locator(".pin-digit")
        inputs.nth(0).fill("1")
        inputs.nth(1).fill("2")
        inputs.nth(2).fill("3")
        inputs.nth(3).fill("4")

        # Wait for Unlock
        page.wait_for_selector("text=SEC Unified", state="visible")

        # Verify Navigation
        page.click("button[data-target='incentive']")
        page.wait_for_selector("text=Dashboard")

        # Verify Locker
        page.click("button[data-target='locker']")
        page.wait_for_selector("text=Secure Local Storage")

        # Take Screenshot
        page.screenshot(path="verification.png")

        print("Verification Successful")
        browser.close()

if __name__ == "__main__":
    verify_app()
