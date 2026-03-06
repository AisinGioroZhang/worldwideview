import { test } from 'node:test';
import * as assert from 'node:assert';

test('fetch camera data from camlist.net via codetabs', async () => {
    const fetchUrl = 'https://api.codetabs.com/v1/proxy?quest=http://camlist.net/';
    
    console.log(`Fetching from ${fetchUrl}...`);
    const res = await fetch(fetchUrl);
    
    assert.ok(res.ok, `Failed to load from URL: ${fetchUrl}. Status: ${res.status}`);
    
    const text = await res.text();
    console.log(`Received ${text.length} bytes of data.`);
    
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        assert.fail('Target URL did not return a valid JSON format. Response preview: ' + text.substring(0, 100));
    }
    
    assert.ok(Array.isArray(data), 'Expected an array of cameras');
    if (data.length > 0) {
        assert.ok(data[0].latitude !== undefined, 'Camera object should have latitude');
        assert.ok(data[0].longitude !== undefined, 'Camera object should have longitude');
        console.log(`Successfully parsed ${data.length} cameras. First camera:`, data[0]);
    } else {
        console.log('Successfully parsed empty array.');
    }
});
