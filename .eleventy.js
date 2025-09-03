export default function(eleventyConfig) {
  eleventyConfig.addCollection("nav", function(collectionApi) {
    return collectionApi.getFilteredByTag("nav").sort(function(a, b) {
      return a.data.weight - b.data.weight;
    });
  });

  eleventyConfig.addFilter("getTranslatedLink", function(lang) {
    const fallback = {
      en: '/',
      he: '/en/'
    };
    return fallback[lang] || '/';
  });

  eleventyConfig.addPassthroughCopy("src/css");

  return {
    dir: {
      input: "src"
    },
    markdownTemplateEngine: false
  };
};
