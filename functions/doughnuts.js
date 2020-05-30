// @ts-check
require("dotenv/config");

const pptr = require("puppeteer");
const { JSDOM } = require("jsdom");
const fetch = require("node-fetch").default;

let domain = "https://boxcardonuts.ca";

const getDoughnuts = async () => {
  const browser = await pptr.launch();

  const page = await browser.newPage();
  await page.goto(`${domain}/product-category/donuts/our-weekly-flavours/`);

  const content = await page.content();
  const dom = new JSDOM(content);

  const [, ...doughnuts] = Array.from(
    dom.window.document.querySelectorAll(".product_cat-our-weekly-flavours")
  ).map((node) => ({
    url: node.querySelector(`a[href]`).getAttribute("href"),
    id: "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
  }));

  await Promise.all(
    doughnuts.map(async (doughnut) => {
      const doughnutPage = await browser.newPage();

      await doughnutPage.goto(doughnut.url);

      const content = await doughnutPage.content();
      const dom = new JSDOM(content);
      const pageClass = ".woocommerce-product-";

      const title = dom.window.document.querySelector(".product_title")
        .innerHTML;

      doughnut.id = title.replace(/\s+/g, "-").toLowerCase();
      doughnut.name = title;

      doughnut.price = `$${
        dom.window.document
          .querySelector(".amount")
          .innerHTML.split("</span>")[1]
      }`;

      const description = dom.window.document.querySelector(
        `${pageClass}details__short-description > p`
      );

      doughnut.description =
        description === null
          ? "No descrioption"
          : description.innerHTML
              .split(/\<[^>]*\>/g)
              .join("")
              .split("&nbsp;")
              .join("")
              .replace("  ", " ");

      doughnut.imageUrl = dom.window.document
        .querySelector(`${pageClass}gallery__image`)
        .querySelector(`a[href]`)
        .getAttribute("href");

      await doughnutPage.close();
    })
  );

  await browser.close();

  return doughnuts;
};

exports.handler = async function (event, context, callback) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 503,
      body: "Unsupported Request Method",
    };
  }

  const url = `https://hooks.slack.com/services/${process.env.SLACK_HOOK}`;

  await fetch(url, {
    method: "POST",
    body: JSON.stringify({ mrkdwn: true, text: "This weeks doughnuts are:" }),
  });
};

// body: {
//   mkdwn: true,
//   text: 'This weeks doughnuts are:',
//   blocks: [
//     {
//       type: 'section',
//       text: {
//         type: 'mrkdwn',
//         text: 'This weeks *ARRAY* of doughnuts are:'
//       }
//     },
//     { type: 'divider' },
//     ...doughnuts.map((doughnut) => {
//       return {
//         type: 'section',
//         block_id: doughnut.id,
//         text: {
//           type: 'mrkdwn',
//           text: `*${doughnut.name}* ${doughnut.price} | <${doughnut.url}| BUY NOW!> \n ${doughnut.description}`
//         },
//         accessory: {
//           type: 'image',
//           image_url: doughnut.imageUrl,
//           alt_text: doughnut.name
//         }
//       };
//     })
//   ]
// }
