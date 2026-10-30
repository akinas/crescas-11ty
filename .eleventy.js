import eleventyNavigation from "@11ty/eleventy-navigation";
import { createScholarlyMarkdown } from "./src/_11ty/markdown.js";
import { registerBlogPlugin } from "./src/_11ty/blog.js";

export default function (eleventyConfig) {
  const md = createScholarlyMarkdown();
  eleventyConfig.setLibrary("md", md);

  registerBlogPlugin(eleventyConfig);

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

  eleventyConfig.addFilter("isoDate", function (date) {
    return (date instanceof Date ? date : new Date(date || Date.now())).toISOString();
  });

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPlugin(eleventyNavigation);

  eleventyConfig.addShortcode("msurl", function (id, text) {
    // Replicates: <a href="https://www.nli.org.il/en/manuscripts/NNL_ALEPH{{ .Get 0 }}">{{ .Get 1 }}</a>
    return `<a href="https://www.nli.org.il/en/manuscripts/NNL_ALEPH${id}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });


  return {
    dir: {
      input: "src"
    },
    markdownTemplateEngine: "njk"
  };
};
