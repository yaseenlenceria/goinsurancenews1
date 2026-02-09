const fs = require('fs');
const path = require('path');

/**
 * INSURANCE INSIGHT - STATIC DATA BUILDER
 * This script syncs JSON data from /data into /scripts/data.js
 */

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(__dirname, './data.js');

function build() {
    console.log('Starting Data Build...');

    try {
        const categories = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf-8'));
        const authors = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'), 'utf-8'));
        const pages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'pages.json'), 'utf-8'));
        const posts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'posts.json'), 'utf-8'));

        const bundle = {
            categories,
            authors,
            pages,
            posts
        };

        const content = `window.INSURANCE_DATA = ${JSON.stringify(bundle, null, 4)};`;
        fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');

        console.log('Update successful: scripts/data.js is now in sync with /data/*.json');
        console.log(`Statistics: ${posts.length} Posts | ${categories.length} Categories`);
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();
