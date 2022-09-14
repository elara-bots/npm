# Example Usage

https://console.developers.google.com/apis - API Key

http://www.google.com/cse/manage/all - CX ID


```js
let Google = require('@elara-services/google-search'), 
    google = new Google("API KEY", "CX ID");

    let res = await google.search("@elara-services/google-search npm");
    if(res.status){
        // Success
        console.log(res); // "res.links" to return all of the links found for that search!
    }else{
        // Failed
        console.log(res);
    }
```
