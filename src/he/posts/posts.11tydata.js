export default {
  layout: "post.njk",
  lang: "he",
  isPost: true,
  isCustomLayout: true,
  eleventyComputed: {
    permalink: (data) => {
      if (data.draft && process.env.BUILD_DRAFTS !== "true") {
        return false;
      }
      const slug = data.slug || data.page.fileSlug;
      return `/he/posts/${slug}/index.html`;
    },
  },
};
