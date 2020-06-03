const { JSDOM } = require('jsdom');
const chromium = require('chrome-aws-lambda');

const getDoughnuts = async () => {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });

  const page = await browser.newPage();
  let domainUrl =
    'https://boxcardonuts.ca/product-category/donuts/our-weekly-flavours';
  await page.goto(domainUrl, { waitUntil: 'networkidle2' });

  const content = await page.content();
  const dom = new JSDOM(content);

  const [, ...doughnuts] = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours')
  ).map((node) => ({
    url: node.querySelector(`a[href]`).getAttribute('href'),
    id: '',
    name: '',
    description: '',
    price: '',
    imageUrl: ''
  }));

  await Promise.all(
    doughnuts.map(async (doughnut) => {
      const doughnutPage = await browser.newPage();

      await doughnutPage.goto(doughnut.url);

      const content = await doughnutPage.content();
      const dom = new JSDOM(content);
      const pageClass = '.woocommerce-product-';

      const title = dom.window.document.querySelector('.product_title')
        .innerHTML;

      doughnut.id = title.replace(/\s+/g, '-').toLowerCase();
      doughnut.name = title;

      doughnut.price = `$${
        dom.window.document
          .querySelector('.amount')
          .innerHTML.split('</span>')[1]
      }`;

      const description = dom.window.document.querySelector(
        `${pageClass}details__short-description > p`
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

      await doughnutPage.close();
    })
  );

  await browser.close();

  return doughnuts;
};

module.exports = { getDoughnuts };
