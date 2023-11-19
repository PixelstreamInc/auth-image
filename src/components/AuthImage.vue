<script>
  
  import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
  import { createC2pa, createL2ManifestStore, selectProducer, selectSocialAccounts, selectEditsAndActivity, selectFormattedGenerator, selectGenerativeInfo, generateVerifyUrl } from 'c2pa'
  import { format, parseISO } from 'date-fns'

  /* These are the icons used for the 'info' icon on the image itself and the four social 
  media icons used on the popover panel */
  import cr from './svg/cr.vue'
  import behance from './svg/behance.vue'
  import twitter from './svg/twitter.vue'
  import instagram from './svg/instagram.vue'
  import facebook from './svg/facebook.vue'
  import github from './svg/facebook.vue'

  export default {
    
    name: 'NewAuthImage',

    components: {
      Popover, PopoverButton, PopoverPanel, behance, twitter, instagram, facebook, github, cr
    },

    /* The promise returned by createC2pa() is 'provided' in the plugin and 'injected' here.
    This gives us composed access to the c2pa object while preventing the blocking of the app's 
    rendering waiting on the promise. It lets us wait for the promise to resolve in the 
    mounted method here before calling getContentCredentials(). The end result is that the app and 
    images load first and then the info icons show up when we get the c2pa object and the manifest 
    store. */
    inject: ['c2paPromise'],
    
    /* We prevent the default $attr behavior of vue and instead assign wrapper attributes (div) and 
    inner attributes (img) manually. */
    inheritAttrs: false,

    data() {
      return {
        id: null,
        hasLoaded: false,
        manifestStore: null, // set by getContentCredentials method
        display: false, // Boolean for conditional display of the popover panel
        editsAndActivity: [], // set by the getContentCredentials method and not a computed because it's promise based.
        imageSource: '', // this is our current source derived from the actual image displayed by the browser
        i18n: {
          'content credentials': {
            'en-US': 'Content Credentials',
            'es-ES': 'Credenciales de contenido'
          },
          'produced by': {
            'en-US': 'Produced by',
            'es-ES': 'Producido por'
          },
          'edits and activity': {
            'en-US': 'Edits and activity',
            'es-ES': 'Ediciones y actividad'
          },
          'assets used': {
            'en-US': 'Assets used',
            'es-ES': 'Activos utilizados'
          },
          'social media': {
            'en-US': 'Social Media',
            'es-ES': 'Redes sociales'
          },
          'see more': {
            'en-US': 'Inspect',
            'es-ES': 'Inspeccionar'
          }
        }
      }
    },

    computed: {

      /* This returns the $attrs that are to be applied to the outer div container. class, style,
      and id are applied to the container.*/
      wrapperAttrs() {
        return { 
          id: this.$attrs.wrapperId,
          class: this.$attrs.wrapperClass,
          style: this.$attrs.wrapperStyle
        }
      },

      /* This returns the $attrs that are to be applied to the inner img element.  Because class,
      style, and id are applied to the container div, we accept innerId, innerClass, and innerStyle
      if the user wants to style the image directly. Certain other attributes are passed through. */
      innerAttrs() {
        return { 
          id: this.id,
          class: this.$attrs.class,
          style: this.$attrs.style,
          width: this.$attrs.width,
          height: this.$attrs.height,
          src: this.$attrs.src,
          srcset: this.$attrs.srcset,
          sizes: this.$attrs.sizes,
          loading: this.$attrs.loading,
          role: this.$attrs.role,
          alt: this.$attrs.alt
        }
      },

      /* This is used directly in the template and other computed properties */
      activeManifest() {
        return this.manifestStore?.activeManifest
      },

      /* This is used in the content credentials section of the template */
      activeManifestThumbnail() {
        return this.activeManifest?.thumbnail?.getUrl().url
      },
      
      /* This is used in the content credentials section of the template */
      signatureIssuer() {
        return this.activeManifest?.signatureInfo?.issuer
      },

      /* Date in content credentials section of the template. PPpp displays like Sep 30, 2022, 7:46:06 PM */
      signatureDate() {
       return this.activeManifest?.signatureInfo?.time
        ? format(parseISO(this.activeManifest.signatureInfo.time), 'PPpp')
        : 'No date available'
      },

      /* Displays in the template in Produced By. Uses CAI JS SDK Selector. */
      producer() {
        return selectProducer(this.activeManifest)?.name
      },

      /* Displays in the template in Produced By. Uses CAI JS SDK helper method. */
      verifyUrl() {
        return generateVerifyUrl(this.imageSource)
      },

      /* Displays in the template in Ingredients section. */
      ingredients() {
        return this.activeManifest?.ingredients
      },
      
      /* Displays in the template in Social Accounts. Uses CAI JS SDK Selector. The added icon
      property is used for the 'is' bound attribute on the component element/component to refer to 
      the imported name of the SVG component. Ex. <component :is="socialAccount.icon" /> */
      socialAccounts() {
        return selectSocialAccounts(this.activeManifest)?.map(social => {
          const icon = ['behance', 'twitter', 'facebook', 'instagram', 'github']
            .filter(sm => social['@id']
              .toLowerCase()
              .includes(sm))
          return { ...social, icon: icon.length === 1  ? icon[0] : '' }
        })
      }

    },

    props: {
      language: {
        type: String,
        default: 'en-US'
      }
    },

    async mounted() {
      /* Used so we have a 'unique' id for our inner image */
      this.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)

      /* Waits for the promise that is injected above. This is received from the plugin.
      Once it resolves, we call setImageSource() and getContentCredentials() to get the 
      manifest store. */
      try {
        this.c2pa = await this.c2paPromise
        if (this.hasLoaded && !this.manifestStore) {
          this.getImageSource() // side effects
          this.getContentCredentials(this.imageSource) // side effects
        }
      } catch (error) {
        console.error('Error loading c2pa object:', error)
      }
    },

    /* This is probably not right, but we'll deal with it later */
    unmounted() {
      this.activeManifest?.thumbnail?.getUrl().dispose()
    },

    methods: {
      
      /* This handles the load event from a newly visible image.  It retrieves the 'currentSrc'
      and calls getContentCredentials again.  This will typically happen on initial page load,
      and possibly when the page is resized by a user if using srcset */
      onloadHandler() {
        this.hasLoaded = true
        if (this.c2pa) {
          this.getImageSource()  // side effects
          this.getContentCredentials(this.imageSource) // side effects
        }
      },

      getImageSource() {
        /*  Check to see if we have access to the img element's current source to make sure we are getting
        the content credentials for the currently visible image when using srcset.  The attrs src really 
        shouldn't be used, but it seemed like it might be a reasonable fallback. Maybe. */
        const image = document.getElementById(this.id)
        this.imageSource = image.currentSrc ? image.currentSrc : this.$attrs.src
      },

      async getContentCredentials(src) {
        try {
          /* Uses c2pa object that ultimately came from the plugin to be shared by all AuthImage components. */
          const { manifestStore } = await this.c2pa.read(src)
          this.manifestStore = manifestStore
          /* Displays in the template in Edits and Activity. Uses CAI JS SDK Selector. Stored to data property
          rather than returned by a computed property because the selector method returns a promise.  This 
          selector probably returns a promise, unlike the other selectors, because it might have to make a
          network request to get a dictionary file. */
          this.editsAndActivity = this.activeManifest && await selectEditsAndActivity(this.activeManifest, this.language)
        } catch (error) {
          console.error('Error reading image:', error)
        }
      }
    }

  }

</script>

<template>

  <div v-bind="wrapperAttrs" class="relative">

    <img @load="onloadHandler" v-bind="innerAttrs" class="w-full" />
    
    <Popover v-if="activeManifest" class="absolute top-2 right-2">
      
      <PopoverButton>
        <cr class="w-8 h-8" />
      </PopoverButton>

      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-1 opacity-0"
      >

        <PopoverPanel class="absolute z-10 top-0 right-10">
          <div class="text-gray-800 text-xs bg-white rounded-lg px-4 py-1 overflow-auto w-72 h-80 shadow-lg">
            
            <!-- Content Credential Section of Popover -->
            <div v-if="activeManifest" class="mb-3 mt-2">
              <h3 class="mb-3 text-lg font-bold">{{ i18n['content credentials'][language] }}</h3>
              <div class="flex items-center">
                <img :src="activeManifestThumbnail" class="w-16 h-16 object-contain bg-gray-100 mr-2" alt="Active manifest thumbnail">
                <div class="flex flex-col">
                  <span class="text-sm">{{ signatureIssuer }}</span>
                  <span class="text-gray-500">{{ signatureDate }}</span>
                </div>
              </div>
            </div>

            <!-- Produced By Section of Popover -->
            <div v-if="producer" class="mb-3">
              <h3 class="pt-3 mb-1 border-t uppercase font-bold">{{ i18n['produced by'][language] }}</h3>
              <p class="text-sm">{{ producer }}</p>
            </div>

            <!-- Edits and Activity Section of Popover -->
            <div v-if="editsAndActivity?.length">
              <h3 class="pt-3 pb-2 border-t uppercase font-bold">{{ i18n['edits and activity'][language] }}</h3>
              <ul>
                <li v-for="edit in editsAndActivity" :key="edit.id" class="flex flex-col mb-3">
                  <span class="text-sm">{{ edit.label }}</span>
                  <span class="text-gray-500">{{ edit.description }}</span>
                </li>
              </ul>
            </div>

            <!-- Assets Used Section of Popover -->
            <div v-if="ingredients?.length" class="mb-3">
              <h3 class="py-3 border-t uppercase font-bold">{{ i18n['assets used'][language] }}</h3>
              <ul class="flex flex-wrap mb-2">
                <li v-for="ingredient in ingredients" :key="ingredient.instanceId" class="mr-2 mb-2">
                  <img v-if="ingredient.thumbnail" :src="ingredient.thumbnail?.getUrl().url" class="w-14 h-14 object-contain bg-gray-100" alt="Thumbnail image from the active manifest.">
                </li>
              </ul>
            </div>

            <!-- Social Media Section of Popover -->
            <div v-if="socialAccounts?.length" class="mb-3">
              <h3 class="py-3 border-t uppercase font-bold">{{ i18n['social media'][language] }}</h3>
              <ul>
                <li v-for="socialAccount in socialAccounts" :key="socialAccount['@id']" class="flex mb-3">
                  <component :is="socialAccount.icon" class="w-5 h-5 mr-3" />
                  <a :href="socialAccount['@id']" target="_blank" class="text-sm text-blue-500 underline hover:bg-white">@{{socialAccount.name}}</a>
                </li>
              </ul>
            </div>

            <!-- View More on Verify Button -->
            <div class="py-3 border-t">
              <a :href="verifyUrl" target="_blank" class="block flex justify-center w-full text-sm text-gray-800 rounded-full border border-gray-400 py-2 mt-2 hover:bg-gray-100">{{ i18n['see more'][language] }}</a>
            </div>

          </div>
        </PopoverPanel>

      </transition>
    </Popover>
  </div>

</template>