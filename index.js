const puppeteer = require("puppeteer");
const fs = require("fs")
let axios = require("axios");
let path = require("path");

const { songsNames } = require("./sonngsNames.json");

(async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto("https://open.spotify.com", { waitUntil: "networkidle0" })
    // await page.goto("https://open.spotify.com")

    let result = []

    for (ele of songsNames) {
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
            // let timer = async () => {
            //     setTimeout(async () => {
            //         // console.log("Timeout started");
            //         let count = 0;
            //         await setInterval(async () => {
            //             await console.log("Interval count:", count++);
            //         }, 1000);
            //         // console.log("First message printed immediately after timeout.");
            //     }, 10000);
            // }
            // timer()
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

        await page.goto("https://open.spotify.com", { waitUntil: "networkidle0", timeout: 30000 })
    }

    console.log("done")

    browser.close()
})()