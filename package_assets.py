
import os
import base64
from bs4 import BeautifulSoup

def inline_assets():
    dist_path = 'dist'
    html_path = os.path.join(dist_path, 'index.html')

    with open(html_path, 'r') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Inline CSS
    for link in soup.find_all('link', rel='stylesheet'):
        css_path = os.path.join(dist_path, link['href'].lstrip('/'))
        if os.path.exists(css_path):
            with open(css_path, 'r') as css_file:
                style_tag = soup.new_tag('style')
                style_tag.string = css_file.read()
                link.replace_with(style_tag)

    # Inline JS
    for script in soup.find_all('script', src=True):
        js_path = os.path.join(dist_path, script['src'].lstrip('/'))
        if os.path.exists(js_path):
            with open(js_path, 'r') as js_file:
                script_tag = soup.new_tag('script')
                script_tag.string = js_file.read()
                script.replace_with(script_tag)

    # Inline images (optional, as it can increase file size significantly)
    # This example will not inline images to keep the file size reasonable.

    with open('curb-ball-standalone.html', 'w') as f:
        f.write(str(soup))

if __name__ == '__main__':
    inline_assets()
