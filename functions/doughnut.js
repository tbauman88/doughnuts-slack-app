// @ts-check

const { JSDOM } = require('jsdom');
const chromium = require('chrome-aws-lambda');

const getDoughnut = async (url) => {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const dom = new JSDOM(content);

  await page.close();

  const doughnut = {
    url,
  };

  const pageClass = '.woocommerce-product-';

  const title = dom.window.document.querySelector('.product_title').innerHTML;

  doughnut.id = title.replace(/\s+/g, '-').toLowerCase();
  doughnut.name = title;

  doughnut.price = `$${
    dom.window.document.querySelector('.amount').innerHTML.split('</span>')[1]
  }`;

  const description = dom.window.document.querySelector(
    `${pageClass}details__short-description > p`,
  );

  doughnut.description =
    description === null
      ? 'No descrioption'
      : description.innerHTML
          .split(/\<[^>]*\>/g)
          .join('')
          .split('&nbsp;')
          .join('')
          .replace('  ', ' ');

  doughnut.imageUrl = dom.window.document
    .querySelector(`${pageClass}gallery__image`)
    .querySelector(`a[href]`)
    .getAttribute('href');

  await browser.close();

  return doughnut;
};

exports.handler = async function (event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 503,
      body: 'Unsupported Request Method',
    };
  }

  const { url } = JSON.parse(event.body);

  return {
    statusCode: 200,
    body: JSON.stringify(await getDoughnut(url)),
  };
};
