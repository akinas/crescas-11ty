export default function(eleventyConfig) {
  eleventyConfig.addCollection("nav", function(collectionApi) {
    return collectionApi.getFilteredByTag("nav").sort(function(a, b) {
      return a.data.weight - b.data.weight;
    });
  });

  eleventyConfig.addFilter("getTranslatedLink", function(page) {
    if (!page || !page.data) {
      return "";
    }
    const translationKey = page.data.translationKey;
    if (!translationKey) {
      return "";
    }
    const collections = this.ctx.collections.all;
    const translation = collections.find(item =>
      item.data.translationKey === translationKey && item.data.lang !== page.data.lang
    );
    return translation ? translation.url : "";
  });

  eleventyConfig.addPassthroughCopy("src/css");

  return {
    dir: {
      input: "src"
    },
    markdownTemplateEngine: false
  };
};
