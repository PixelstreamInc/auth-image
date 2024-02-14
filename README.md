# Pixelstream Authentic Image Plugin for Vue.js

This plugin allows you to display C2PA enabled images with an information icon that shows the validated active manifest info.  It also has basic functionality with srcset for responsive images and re-validates the manifest info when the visible image source changes.  This will eventually need to be debounced to prevent excessive bandwidth usage.

## Requirements

- Vue 3
- Vite

## How to use

Note: This package is no longer published on NPM, so to use it you will first need to clone the repo, build it locally, and link with NPM.

Then, from your Vue3/Vite project's root directory run

```
npm link @pixelstream/new-auth-image
```

Open the project's main.js file and import the plugin and css. If this is a fresh install, replace the existing createApp(App).mount('#app') with

```
import AuthImage from '@pixelstream/new-auth-image'
import '@pixelstream/new-auth-image/dist/style.css'

const app = createApp(App)
app.use(AuthImage)
app.mount('#app')
```

You can now add the component to the template of any of your Vue components without having to import the AuthImage component or the C2PA library. Replace the src or srcset with your own C2PA signed image(s).

```
<AuthImage src="signed-image.jpg" />
```

or

```
<AuthImage
  src="signed-image.jpg"
  srcset="
    signed-image@600.jpg 600w, 
    signed-image@2500.jpg 2500w
  "
  sizes="(min-width: 1024px) 33vw, 100vw"
/>
```

Now run

```
npm run dev
```

And you should be able to validate the image and view the manifest data in the popover when you click on the info icon!


For more information, please visit [https://pixelstream.com](https://pixelstream.com)




