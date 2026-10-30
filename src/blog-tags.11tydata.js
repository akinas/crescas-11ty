export default {
  eleventyComputed: {
    lang: (data) => data.taxArchive?.lang || "he",
    title: (data) => {
      if (!data.taxArchive) return "";
      return data.taxArchive.lang === "he"
        ? `תגית: ${data.taxArchive.name}`
        : `Tag: ${data.taxArchive.name}`;
    },
    permalink: (data) =>
      data.taxArchive ? `${data.taxArchive.url}index.html` : false,
    eleventyExcludeFromCollections: (data) => !data.taxArchive,
  },
};
