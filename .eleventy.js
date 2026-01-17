import markdownIt from "markdown-it";
import eleventyNavigation from "@11ty/eleventy-navigation";

export default function (eleventyConfig) {
  const md = markdownIt({ html: true });

  eleventyConfig.addCollection("nav", function (collectionApi) {
    return collectionApi.getFilteredByTag("nav").sort(function (a, b) {
      return a.data.weight - b.data.weight;
    });
  });

  eleventyConfig.addFilter("getTranslatedLink", function (lang) {
    const fallback = {
      en: '/',
      he: '/en/'
    };
    return fallback[lang] || '/';
  });

  eleventyConfig.addFilter("markdownInline", function (content) {
    return content ? md.renderInline(content) : "";
  });

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPlugin(eleventyNavigation);


  return {
    dir: {
      input: "src"
    },
    markdownTemplateEngine: false
  };
};
