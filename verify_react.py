
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print("Navigating to app...")
            await page.goto("http://localhost:5173", timeout=60000)

            # 1. PIN Check
            print("Checking for PIN screen...")
            try:
                await page.wait_for_selector('input[type="password"]', timeout=5000)
                print("PIN screen detected. Entering PIN...")
                pin_inputs = await page.query_selector_all('input[type="password"]')
                if len(pin_inputs) == 4:
                    await pin_inputs[0].fill('1')
                    await pin_inputs[1].fill('2')
                    await pin_inputs[2].fill('3')
                    await pin_inputs[3].fill('4')
                    print("PIN entered.")
                else:
                    print(f"Found {len(pin_inputs)} password inputs, expected 4.")
            except:
                print("No PIN screen detected or already logged in.")

            # 2. Wait for Dashboard/Tracker to load
            print("Waiting for main content...")
            await page.wait_for_selector('text="SEC Unified"', timeout=10000)

            # 3. Navigate to Incentive
            print("Navigating to Incentive tab...")
            # Look for button with "Incentive" text or calculator icon
            await page.click('button[data-target="incentive"]')
            # Or use text "Incentive"

            # 4. Check for Disclaimer Text
            print("Verifying disclaimer text...")
            try:
                await page.wait_for_selector('text="THIS INCENTIVE WORKING IS SUBJECT TO QUALIFICATION CRITERIA"', timeout=5000)
                print("SUCCESS: Disclaimer text found.")
            except:
                print("FAILED: Disclaimer text NOT found.")
                await page.screenshot(path="debug_disclaimer_fail.png")
                exit(1)

            # 5. Open Config
            print("Opening Config...")
            await page.click('button:has-text("Config")')

            # 6. Check for NEW Tabs
            print("Verifying new tabs...")
            await page.wait_for_selector('text="Incentive Config"', timeout=5000)
            await page.screenshot(path="debug_config_open_react.png")

            tabs = ["SP", "TB", "WR", "CP", "NPC", "Bun", "Acc"]
            missing = []
            for t in tabs:
                if await page.query_selector(f'button:has-text("{t}")'):
                    print(f"Tab {t} found.")
                else:
                    print(f"Tab {t} NOT found.")
                    missing.append(t)

            if missing:
                print(f"FAILED: Missing tabs: {missing}")
                exit(1)
            else:
                print("SUCCESS: All new tabs found.")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="debug_error.png")
            exit(1)
        finally:
            await browser.close()

asyncio.run(run())
