import requests from bs4 
import BeautifulSoup as bs

url = 'https://boxcardonuts.ca/product-category/donuts/our-weekly-flavours'

res = requests.get(url)
html = res.text

soup = bs( html, 'html.parser' )

pageClass = '.woocommerce-product-'

donuts = []

# visit each product link
# .product_cat-our-weekly-flavours
for a in soup.find_all( 'a',  'ast-loop-product__link' ):
  html = requests.get(a['href']).text
  soup = bs( html, 'html.parser' )
  
  donut = {}
  donut['title'] = soup.select('.product_title')[0].text.strip()
  donut['price'] = soup.select('.amount')[0].text.strip()
  donut['description'] = soup.select(f'{pageClass}details__short-description > p')[0].text.strip()
  donut['imageUrl'] = soup.select(f'{pageClass}gallery__image > a[href]')[0]['href']
  
  donuts.append(donut)

variables['response'] = { 'donuts': donuts }