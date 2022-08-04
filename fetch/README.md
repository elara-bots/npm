## This is a rework of [centra](https://npmjs.com/package/centra)
The package was made smaller and reworked some stuff within the package. 
The main change is `<res>.text()`, `<res>.json()` not being async anymore. 

----


## The core lightweight HTTP client for Node
-------
## Install

```shell
npm i @elara-services/fetch
```

## Getting Started

First, require the library.

```js
const c = require("@elara-services/fetch")
```

Then let's make a request in an async function!

```js
	const res = await fetch("https://example.com")
		.send();
	console.log(res.json())
```

## More advanced usage

### Send data in a JSON body

```js
	fetch("https://example.com/nonexistentJSONAPI", "POST")
	.body({
		name: "Jim"
	}, "json")
	.send()
	.then((res) => {
		/*...*/
	})
```

### Send data in a form body

```js
	fetch("https://example.com/nonexistentJSONAPI", "POST")
	.body({
		name: "Kim"
	}, "form")
	.send()
	.then((res) => {
		/*...*/
	})
```

### Set query string parameters

One at a time:

```js
	fetch("https://example.com/user")
	.query("id", "9101467")
	.send()
	.then((res) => {
		/*...*/
	})
```

Many at a time:

```js
	fetch("https://example.com/user")
	.query({
		id: "9101467",
		name: "Bob"
	})
	.send()
	.then((res) => {
		/*...*/
	})
```

### Set a request timeout

```js
	fetch("https://example.com")
	.timeout(2000)
	.send()
	.then((res) => {
		// Success!
	})
	.catch((err) => {
		// Has the request timed out?
	})
```

### Stream a request's response

In this example, the [stream](https://nodejs.org/api/stream.html) is piped to a file:

```js
	// require the fs module beforehand
	fetch("https://example.com/image.png")
	.stream()
	.send()
	.then((stream) => stream.pipe(fs.createWriteStream(path.join(__dirname, "logo.png"))))
```

### Switch paths on the fly

```js
	fetch("https://example.me/test")
	.path("/hello")
	.send()
	// This will make a request to https://example.com/test/hello
```

### Specify request headers

One at a time:

```js
	fetch("https://example.com")
	.header("Content-Type", "application/json")
	.send()
```

Many at a time:

```js
	fetch("https://example.com")
	.header({
		"Content-Type": "application/json",
		"X-Connecting-With": "elara-bots/fetch"
	})
	.send()
```

### Modify core HTTP request options

See [http.request](https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_http_request_url_options_callback)'s options for more information about core HTTP request options.
Let's change our localAddress as an example.

```js
	fetch("https://example.com")
	.option("localAddress", "127.0.0.2")
	.send()
```

### Accept compressed responses

```js
	fetch("https://example.com")
	.compress()
	.send()
	// This will cause elara-bots/fetch to accept compressed content from the server. (gzip and deflate are currently supported)
```
