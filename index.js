const puppeteer = require("puppeteer");
const fs = require("fs")
let axios = require("axios");
let path = require("path");

// const { songsNames } = require("./sonngsNames.json");

// const playListUrl =new URL("https://open.spotify.com/playlist/0i2S0eEdftTrmLKueMWUKX?nd=1&dlsi=2873347b73e34dd5");
const playListUrl = new URL("https://open.spotify.com/playlist/2mzlU8dfi5qqdWahPvbQyE");


(async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(playListUrl, { waitUntil: "networkidle0", timeout: 300000 })

    const songNameClass = ".btE2c3IKaOXZ4VNAb8WQ";
    await page.waitForSelector(songNameClass, { timeout: 300000 })

    const songsCountSelector = ".GI8QLntnaSCh2ONX_y2c"
    // const songsCountSelector = ".w1TBi3o5CTM7zW1EB3Bm "

    await page.waitForSelector(songsCountSelector, { timeout: 30000 })
    const songsCountElement = await page.$(songsCountSelector)

    const songsCount = await page.evaluate(e => e?.innerText, songsCountElement)

    const songsCOuntValue = Number(songsCount.split(" ")[0])

    console.log("playList count : ", songsCOuntValue);

    let scrollableContainerSelector = ".main-view-container__scroll-node--offset-topbar [data-overlayscrollbars-viewport]";
    await page.waitForSelector(scrollableContainerSelector, { timeout: 30000 });
    const songsList = await page.$(scrollableContainerSelector)

    await page.evaluate(async (element) => {
        return new Promise((resolve) => {
            const scrollStep = 1050; // Scroll step in pixels
            const interval = 2000; // Interval between each scroll step (milliseconds)

            const scrollInterval = setInterval(() => {
                const maxScroll = element.scrollHeight - element.clientHeight;
                if (element.scrollTop + scrollStep >= maxScroll) {
                    element.scrollTop = maxScroll; // Ensure it reaches the bottom
                    clearInterval(scrollInterval);
                    resolve();
                } else {
                    element.scrollTop += scrollStep; // Scroll down 100px at a time
                }
            }, interval);
        });
    }, songsList);

    await new Promise((resolve) => setTimeout(resolve(), 3000))

    const songsNames = await page.$$(songNameClass);

    let songsValues = []
    for (let i = 0; i < songsNames?.length; i++) {
        const value = await page.evaluate(ele => ele?.innerText, songsNames[i])
        songsValues.push(value)
    }

    let uniqueSongsValues = [...new Set(songsValues)]?.filter(Boolean)

    console.log("extracted songs count : ", uniqueSongsValues?.length);

    await page.goto("https://open.spotify.com", { waitUntil: "networkidle0" })

    let result = []

    for (ele of uniqueSongsValues) {
        try {
            const searchiconSelector = ".Button-sc-1dqy6lx-0";
            await page.waitForSelector(searchiconSelector, { timeout: 30000 });
            await page.click(searchiconSelector);

            const searchInputSelector = ".Input-sc-1gbx9xe-0";
            await page.waitForSelector(searchInputSelector, { timeout: 30000 });
            await page.click(searchInputSelector);

            await page.type(searchInputSelector, ele);

            const popularitem = ".ouEZqTcvcvMfvezimm_J"
            // const popularitem = ".btE2c3IKaOXZ4VNAb8WQ"

            await page.waitForSelector(popularitem, { timeout: 10000 })

            await page.click(popularitem)

            const url = page.url()

            if (url) {
                await page.goto("https://spotifymate.com/en", { waitUntil: "networkidle0" });
                const input = 'input[name="url"]';
                await page.waitForSelector(input, { timeout: 30000 })
                await page.click(input);

                await page.type(input, url)

                const send = "#send";
                await page.waitForSelector(send, { timeout: 30000 })
                await page.click(send);

                const btnSelector = "a.abutton"
                await page.waitForSelector(btnSelector, { timeout: 20000 })
                let buttons = await page.$$(btnSelector)
                let href = await buttons[0].evaluate(e => e?.getAttribute("href"))

                if (!href) {
                    console.log("error finding song link : ", ele)
                } else {
                    try {
                        const downloadPath = path.join(__dirname, "SingleFileSongs");
                        const songName = `${ele}.mp3`;
                        if (!fs.existsSync(downloadPath)) {
                            fs.mkdirSync(downloadPath)
                        }
                        const filePath = path.join(downloadPath, songName);

                        const song = await axios.get(href, { responseType: "stream" });
                        const writer = fs.WriteStream(filePath);

                        song.data.pipe(writer)
                        await new Promise((resolve, reject) => {
                            writer.on("finish", resolve)
                            writer.on("error", reject)
                        })
                        // console.log(ele, " downloaded")
                    } catch (error) {
                        console.log("error downloading the song : ", ele)
                    }
                }
            }

            await page.goto("https://open.spotify.com", { waitUntil: "networkidle0", timeout: 40000 })
        } catch (error) {
            console.log("error downloading song : ", ele);
        }
    }

    console.log("done")

    browser.close()
})()
