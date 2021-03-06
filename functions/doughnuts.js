// @ts-check
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch').default;

const getDoughnuts = async () => {
  const content = await fetch(
    'https://boxcardonuts.ca/product-category/donuts/our-weekly-flavours?orderby=price'
  ).then((res) => res.text());

  const dom = new JSDOM(content);

  const [, ...doughnuts] = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours')
  ).map((node) => {
    const name = node.querySelector('.woocommerce-loop-product__title')
      .textContent;
    return {
      url: node.querySelector(`a[href]`).getAttribute('href'),
      name,
      id: name.replace(/\s+/g, '-').toLowerCase(),
      price: `$${node.querySelector('.amount').innerHTML.split('</span>')[1]}`,
      description: '',
      imageUrl: node
        .querySelector('.woocommerce-loop-product__link img')
        .getAttribute('src')
    };
  });

  await Promise.all(
    doughnuts.map(async (doughnut) => {
      const content = await fetch(doughnut.url).then((res) => res.text());
      const dom = new JSDOM(content);
      const pageClass = '.woocommerce-product-';

      const description = dom.window.document.querySelector(
        `${pageClass}details__short-description > p`
      );

      doughnut.description =
        description === null
          ? 'No description'
          : description.innerHTML
              .split(/\<[^>]*\>/g)
              .join('')
              .split('&nbsp;')
              .join('')
              .replace('  ', ' ');
    })
  );

  return doughnuts;
};

exports.handler = async function (event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 503,
      body: 'Unsupported Request Method'
    };
  }

  callback(null, { statusCode: 200, body: '' });

  try {
    const doughnuts = await getDoughnuts();
    const url = `https://hooks.slack.com/services/${process.env.VEHIKL_SOCIAL}`;

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                doughnuts.length === 0
                  ? 'This weeks *ARRAY* of doughnuts are: `undefined is not a function!` :sad:'
                  : '`Array.sort()` this weeks doughnuts by price'
            }
          },
          { type: 'divider' },
          ...doughnuts.map((doughnut) => {
            return {
              type: 'section',
              block_id: doughnut.id,
              text: {
                type: 'mrkdwn',
                text: `*${doughnut.name}* ${doughnut.price} | <${doughnut.url}| BUY NOW!> \n ${doughnut.description}`
              },
              accessory: {
                type: 'image',
                image_url: doughnut.imageUrl,
                alt_text: doughnut.name
              }
            };
          })
        ]
      })
    });
  } catch (e) {
    callback(null, { statusCode: 500, body: 'Internal Server Error: ' + e });
  }
};
