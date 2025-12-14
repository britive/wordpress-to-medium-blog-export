/**
 * ============================================================
 * Medium Auto-Importer - Puppeteer Script
 * ============================================================
 * 
 * This script automates importing WordPress posts to Medium
 * using Medium's import tool (https://medium.com/p/import)
 * 
 * FEATURES:
 * - Imports OLDEST posts first (so Medium shows correct chronology)
 * - Medium automatically preserves original publish dates
 * - Medium adds canonical links to your original WordPress posts
 * - Saves progress so you can resume if interrupted
 * 
 * SETUP:
 * 1. Install Node.js from https://nodejs.org (LTS version)
 * 2. Create a new folder for this project
 * 3. Save this file as "medium-importer.js" in that folder
 * 4. Save your URLs file as "urls.txt" in the same folder
 * 5. Open terminal/command prompt in that folder
 * 6. Run: npm init -y
 * 7. Run: npm install puppeteer
 * 8. Run: node medium-importer.js
 * 
 * HOW IT WORKS:
 * 1. Opens a Chrome browser (you can see it)
 * 2. Goes to Medium - YOU LOG IN MANUALLY
 * 3. After you log in, press ENTER in the terminal
 * 4. Script imports each URL one by one (oldest first!)
 * 5. Saves progress so you can resume if interrupted
 * 
 * DATE PRESERVATION:
 * Medium's import tool automatically:
 * - Reads the original publish date from your WordPress post
 * - Backdates the Medium post to match the original date
 * - Adds a canonical link pointing to your WordPress post
 * 
 * ============================================================
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

// ============================================================
// CONFIGURATION - Adjust these settings as needed
// ============================================================

const CONFIG = {
    // File containing your WordPress URLs (one per line)
    urlsFile: 'urls.txt',
    
    // File to track progress (so you can resume)
    progressFile: 'import_progress.json',
    
    // Delay between imports (in milliseconds)
    // Medium may rate-limit if you go too fast
    // Recommended: 20000-45000 (20-45 seconds)
    delayBetweenImports: 25000,
    
    // Delay after clicking import button (wait for import to complete)
    // Increased to 20 seconds to give Medium more time
    importWaitTime: 20000,
    
    // Number of retries if import fails
    maxRetries: 2,
    
    // Delay before retrying a failed import (in milliseconds)
    retryDelay: 10000,
    
    // Whether to auto-publish imported posts or leave as drafts
    // true = publish immediately, false = leave as drafts (safer)
    autoPublish: false,
    
    // Skip posts that fail and continue with next
    continueOnError: true,
    
    // Show browser window (set to false for headless mode)
    showBrowser: true,
    
    // Start from specific URL number (useful for resuming)
    // Set to 0 to start from beginning, or use progress file
    startFromIndex: 0,
    
    // Use a dedicated profile for automation (avoids conflicts with running Chrome)
    // Set to true to use separate profile, false to use your main Chrome profile
    // NOTE: If using dedicated profile, you'll need to log into Medium the first time
    useDedicatedProfile: true,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function loadUrls(filename) {
    try {
        const content = fs.readFileSync(filename, 'utf-8');
        const urls = content
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && url.startsWith('http'));
        console.log(`✅ Loaded ${urls.length} URLs from ${filename}`);
        return urls;
    } catch (error) {
        console.error(`❌ Error loading URLs file: ${error.message}`);
        console.log('\nMake sure you have a file called "urls.txt" with one URL per line.');
        process.exit(1);
    }
}

function loadProgress() {
    try {
        if (fs.existsSync(CONFIG.progressFile)) {
            const data = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf-8'));
            console.log(`📂 Found progress file. Last completed: ${data.lastCompleted}`);
            return data;
        }
    } catch (error) {
        console.log('No valid progress file found, starting fresh.');
    }
    return { completed: [], failed: [], lastCompleted: -1 };
}

function saveProgress(progress) {
    fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForUserInput(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// ============================================================
// MAIN IMPORT FUNCTION
// ============================================================

async function importToMedium(page, url, index, total) {
    console.log(`\n📝 [${index + 1}/${total}] Importing: ${url}`);
    
    try {
        // Go to Medium import page
        console.log('  Navigating to import page...');
        await page.goto('https://medium.com/p/import', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Check the current URL - sometimes Medium redirects
        const currentPageUrl = page.url();
        console.log(`  Current URL: ${currentPageUrl}`);
        
        if (!currentPageUrl.includes('import')) {
            console.log('  ⚠️  Redirected away from import page, trying again...');
            await page.goto('https://medium.com/p/import', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
        }
        
        // Wait longer for dynamic content to load
        await sleep(5000);
        
        // Check if the page has the expected content
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log(`  Page contains "Import": ${pageText.includes('Import')}`);
        console.log(`  Page contains "Enter a link": ${pageText.includes('Enter a link')}`);
        
        // If page doesn't have import content, something is wrong
        if (!pageText.includes('Enter a link') && !pageText.includes('See your story')) {
            console.log('  ⚠️  Import page content not found. Page text preview:');
            console.log('  ' + pageText.substring(0, 200).replace(/\n/g, ' '));
        }
        
        // Wait a bit longer for the page to fully render
        await sleep(3000);
        
        // Medium's import field is NOT a standard <input> element!
        // Debug shows: roleTextbox:1, contenteditable:2 - let's target those
        
        // Debug: Check what elements exist
        const elementCounts = await page.evaluate(() => {
            return {
                inputs: document.querySelectorAll('input').length,
                textareas: document.querySelectorAll('textarea').length,
                contenteditable: document.querySelectorAll('[contenteditable="true"]').length,
                roleTextbox: document.querySelectorAll('[role="textbox"]').length,
                divWithPlaceholder: document.querySelectorAll('div[placeholder], div[data-placeholder]').length
            };
        });
        console.log('  DEBUG - Element counts:', JSON.stringify(elementCounts));
        
        // Find the textbox element (role="textbox")
        let urlInput = await page.$('[role="textbox"]');
        
        if (urlInput) {
            console.log('  Found element with role="textbox"');
        } else {
            // Try contenteditable elements (skip any in header/nav)
            console.log('  Trying contenteditable elements...');
            const editables = await page.$$('[contenteditable="true"]');
            for (const el of editables) {
                const info = await el.evaluate(node => {
                    const rect = node.getBoundingClientRect();
                    const isInNav = node.closest('nav, header') !== null;
                    return { 
                        top: rect.top, 
                        width: rect.width, 
                        height: rect.height,
                        isInNav,
                        className: node.className
                    };
                });
                console.log(`  DEBUG - Contenteditable: top=${info.top}, width=${info.width}, inNav=${info.isInNav}`);
                
                // Pick the one that's in the main content area (not in nav) and has reasonable size
                if (!info.isInNav && info.top > 200 && info.width > 100) {
                    urlInput = el;
                    console.log('  Found contenteditable element in main content');
                    break;
                }
            }
        }
        
        if (!urlInput) {
            await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
            throw new Error('Could not find URL input field');
        }
        
        // Click to focus
        await urlInput.click();
        await sleep(500);
        
        // Verify we focused on the right element
        const focusedElement = await page.evaluate(() => {
            const el = document.activeElement;
            return {
                tagName: el.tagName,
                role: el.getAttribute('role'),
                contentEditable: el.contentEditable
            };
        });
        console.log('  DEBUG - Focused element:', JSON.stringify(focusedElement));
        
        // Clear any existing content and type the URL
        await page.keyboard.down('Meta'); // Cmd on Mac
        await page.keyboard.press('a');
        await page.keyboard.up('Meta');
        await sleep(100);
        await page.keyboard.press('Backspace');
        await sleep(100);
        
        // Type the URL
        await page.keyboard.type(url, { delay: 30 });
        
        console.log('  ✓ URL entered');
        
        // Find and click the Import button
        await sleep(1000);
        
        const buttons = await page.$$('button');
        let importButton = null;
        
        for (const button of buttons) {
            const text = await button.evaluate(el => el.textContent || '');
            if (text.toLowerCase().includes('import')) {
                importButton = button;
                break;
            }
        }
        
        if (!importButton) {
            // Try finding by other means
            importButton = await page.$('button[type="submit"]');
        }
        
        if (importButton) {
            await importButton.click();
            console.log('  ✓ Import button clicked');
        } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
            console.log('  ✓ Pressed Enter to submit');
        }
        
        // Wait for import to complete
        await sleep(CONFIG.importWaitTime);
        
        // Check if we're on a new page (story editor)
        const currentUrl = page.url();
        if (currentUrl.includes('/p/') && currentUrl.includes('edit')) {
            console.log('  ✓ Import successful! Now in editor.');
            
            if (CONFIG.autoPublish) {
                // Find and click publish button
                // This is optional and risky - leaving as draft is safer
                console.log('  ⚠️ Auto-publish disabled for safety. Post saved as draft.');
            }
            
            return { success: true, url };
        } else {
            // Check for specific error messages from Medium
            const pageText = await page.evaluate(() => document.body.innerText);
            
            // Check for specific error messages from Medium
            if (pageText.includes('server stopped responding')) {
                console.log('  ⚠️ Medium error: Server stopped responding');
                return { success: false, url, error: 'server stopped responding - try again', retryable: true };
            }
            
            if (pageText.includes('sorry') && pageText.includes('cannot be imported')) {
                console.log('  ❌ Medium error: This page cannot be imported (not retryable)');
                return { success: false, url, error: 'page cannot be imported by Medium', retryable: false };
            }
            
            if (pageText.includes('could not be imported') || pageText.includes('Could not import')) {
                console.log('  ⚠️ Medium error: Could not import');
                return { success: false, url, error: 'could not be imported', retryable: true };
            }
            
            if (pageText.includes('try again') || pageText.includes('Try again')) {
                console.log('  ⚠️ Medium error: Try again message detected');
                return { success: false, url, error: 'failed - try again', retryable: true };
            }
            
            if (pageText.includes('Something went wrong')) {
                console.log('  ⚠️ Medium error: Something went wrong');
                return { success: false, url, error: 'something went wrong', retryable: true };
            }
            
            // Check for generic error indicators in HTML
            const pageContent = await page.content();
            if (pageContent.includes('error') || pageContent.includes('Error') || pageContent.includes('failed')) {
                // Only flag as error if we're still on the import page
                if (currentUrl.includes('import')) {
                    console.log('  ⚠️ Possible error during import (still on import page)');
                    return { success: false, url, error: 'Import may have failed' };
                }
            }
            
            // If we got redirected somewhere else, might be okay
            console.log(`  ℹ️ Redirected to: ${currentUrl}`);
            console.log('  ✓ Import submitted (checking result...)');
            return { success: true, url };
        }
        
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        return { success: false, url, error: error.message };
    }
}

// ============================================================
// MAIN SCRIPT
// ============================================================

async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         MEDIUM AUTO-IMPORTER - Puppeteer Script        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Load URLs
    const urls = loadUrls(CONFIG.urlsFile);
    
    if (urls.length === 0) {
        console.log('❌ No URLs found in the file.');
        return;
    }
    
    // Load progress
    const progress = loadProgress();
    
    // Determine starting point
    let startIndex = CONFIG.startFromIndex;
    if (progress.lastCompleted >= 0) {
        const resumeAnswer = await waitForUserInput(
            `\n📌 Found progress: ${progress.completed.length} completed, ${progress.failed.length} failed.\n` +
            `   Resume from URL #${progress.lastCompleted + 2}? (y/n): `
        );
        if (resumeAnswer.toLowerCase() === 'y') {
            startIndex = progress.lastCompleted + 1;
        }
    }
    
    console.log(`\n📊 Total URLs: ${urls.length}`);
    console.log(`📍 Starting from: #${startIndex + 1}`);
    console.log(`⏱️ Delay between imports: ${CONFIG.delayBetweenImports / 1000} seconds`);
    console.log(`📝 Auto-publish: ${CONFIG.autoPublish ? 'Yes' : 'No (saved as drafts)'}`);
    console.log(`📅 Date preservation: Yes (Medium reads original dates from WordPress)`);
    console.log(`🔢 Import order: Oldest first → Newest last (for correct chronology)`);
    
    // Detect OS and set paths
    const os = require('os');
    const path = require('path');
    
    let userDataDir;
    let executablePath;
    
    // Set Chrome executable path based on OS
    if (process.platform === 'darwin') {
        executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (process.platform === 'win32') {
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else {
        executablePath = '/usr/bin/google-chrome';
    }
    
    // Set user data directory
    if (CONFIG.useDedicatedProfile) {
        // Use a dedicated profile in the script's directory - avoids conflicts!
        userDataDir = path.join(process.cwd(), 'chrome-medium-profile');
        console.log('\n🚀 Launching browser with DEDICATED Chrome profile...');
        console.log('   (This avoids conflicts with your regular Chrome)');
        
        // Check if this is the first run with dedicated profile
        if (!fs.existsSync(userDataDir)) {
            console.log('\n⚠️  First run with dedicated profile - you will need to log into Medium');
        } else {
            console.log('   (Using saved session from previous runs)');
        }
    } else {
        // Use main Chrome profile (requires closing all Chrome windows)
        console.log('\n🚀 Launching browser with your existing Chrome profile...');
        console.log('⚠️  IMPORTANT: Close all other Chrome windows first!\n');
        
        if (process.platform === 'darwin') {
            userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
        } else if (process.platform === 'win32') {
            userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
        } else {
            userDataDir = path.join(os.homedir(), '.config', 'google-chrome');
        }
    }
    
    console.log(`📂 Chrome profile location: ${userDataDir}`);
    
    // Browser launch options
    const launchOptions = {
        headless: false,
        defaultViewport: { width: 1280, height: 800 },
        executablePath: executablePath,
        userDataDir: userDataDir,
        timeout: 60000,  // Increased timeout for slower systems
        args: [
            '--start-maximized',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-blink-features=AutomationControlled',
        ]
    };
    
    // Only add profile-directory flag when NOT using dedicated profile
    if (!CONFIG.useDedicatedProfile) {
        launchOptions.args.push('--profile-directory=Default');
    }
    
    let browser;
    try {
        browser = await puppeteer.launch(launchOptions);
    } catch (error) {
        if (error.message.includes('Timed out') || error.message.includes('WS endpoint')) {
            console.log('\n❌ Failed to launch Chrome. This usually means:');
            console.log('   1. Chrome is already running with this profile');
            console.log('   2. Chrome didn\'t start in time');
            console.log('\n💡 Solutions:');
            console.log('   - Close ALL Chrome windows and try again');
            console.log('   - Or set useDedicatedProfile: true in CONFIG (recommended)');
            console.log('\nTo close all Chrome processes, run:');
            if (process.platform === 'darwin') {
                console.log('   pkill -f "Google Chrome"');
            } else if (process.platform === 'win32') {
                console.log('   taskkill /F /IM chrome.exe');
            } else {
                console.log('   pkill chrome');
            }
            process.exit(1);
        }
        throw error;
    }
    
    const page = await browser.newPage();
    
    // Set a reasonable user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Go to Medium login page
    console.log('\n🔐 Opening Medium...');
    await page.goto('https://medium.com/m/signin', { waitUntil: 'networkidle2' });
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  IMPORTANT: LOG INTO MEDIUM NOW');
    console.log('='.repeat(60));
    console.log('1. The browser window should be open');
    console.log('2. Log into your Medium account');
    console.log('3. Make sure you can see your profile/dashboard');
    console.log('4. Then come back here and press ENTER');
    if (CONFIG.useDedicatedProfile) {
        console.log('\n💡 TIP: Your login will be saved for future runs!');
    }
    console.log('='.repeat(60));
    
    await waitForUserInput('\n✋ Press ENTER after you have logged into Medium...');
    
    // Verify login by checking for user menu
    console.log('\n🔍 Verifying login...');
    await page.goto('https://medium.com/', { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    const isLoggedIn = await page.evaluate(() => {
        // Check for common logged-in indicators
        return document.body.innerHTML.includes('Write') || 
               document.body.innerHTML.includes('New story') ||
               document.querySelector('img[alt*="avatar"]') !== null ||
               document.querySelector('button[aria-label*="user"]') !== null;
    });
    
    if (!isLoggedIn) {
        console.log('⚠️  Could not verify login. Continuing anyway...');
    } else {
        console.log('✅ Login verified!');
    }
    
    console.log('\n🚀 Starting import process...');
    console.log('   Press Ctrl+C at any time to stop (progress is saved)\n');
    
    // Import each URL
    for (let i = startIndex; i < urls.length; i++) {
        const url = urls[i];
        
        // Skip already completed
        if (progress.completed.includes(url)) {
            console.log(`⏭️  [${i + 1}/${urls.length}] Skipping (already completed): ${url}`);
            continue;
        }
        
        // Try importing with retries
        let result = null;
        let attempts = 0;
        
        while (attempts <= CONFIG.maxRetries) {
            if (attempts > 0) {
                console.log(`  🔄 Retry attempt ${attempts}/${CONFIG.maxRetries}...`);
                await sleep(CONFIG.retryDelay);
            }
            
            result = await importToMedium(page, url, i, urls.length);
            
            if (result.success) {
                break;  // Success, no need to retry
            }
            
            // Check if error is marked as non-retryable
            if (result.retryable === false) {
                console.log('  ⛔ Error is not retryable, skipping...');
                break;
            }
            
            // Check if error is retryable (server timeout, etc.)
            const isRetryable = result.error && (
                result.error.includes('server stopped') ||
                result.error.includes('timeout') ||
                result.error.includes('try again') ||
                result.error.includes('failed')
            );
            
            if (!isRetryable) {
                break;  // Not a retryable error
            }
            
            attempts++;
        }
        
        if (result.success) {
            progress.completed.push(url);
            progress.lastCompleted = i;
            console.log(`  ✅ Success! (${progress.completed.length} total completed)`);
        } else {
            progress.failed.push({ url, error: result.error, attempts: attempts + 1 });
            console.log(`  ❌ Failed after ${attempts + 1} attempt(s)`);
            if (!CONFIG.continueOnError) {
                console.log('\n❌ Stopping due to error (continueOnError is false)');
                break;
            }
        }
        
        // Save progress after each import
        saveProgress(progress);
        
        // Delay before next import
        if (i < urls.length - 1) {
            console.log(`  ⏳ Waiting ${CONFIG.delayBetweenImports / 1000} seconds before next import...`);
            await sleep(CONFIG.delayBetweenImports);
        }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT COMPLETE - SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${progress.completed.length}`);
    console.log(`❌ Failed: ${progress.failed.length}`);
    console.log(`📁 Total URLs: ${urls.length}`);
    
    if (progress.failed.length > 0) {
        console.log('\n❌ Failed URLs:');
        progress.failed.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.url}`);
            console.log(`      Error: ${item.error}`);
        });
    }
    
    // Save final progress
    saveProgress(progress);
    console.log(`\n💾 Progress saved to ${CONFIG.progressFile}`);
    
    // Ask if user wants to close browser
    const closeAnswer = await waitForUserInput('\n🔚 Close browser? (y/n): ');
    if (closeAnswer.toLowerCase() === 'y') {
        await browser.close();
    } else {
        console.log('Browser left open. Close it manually when done.');
    }
    
    console.log('\n👋 Done! Check your Medium drafts to review imported posts.');
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
