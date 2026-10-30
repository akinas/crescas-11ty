export default {
  eleventyComputed: {
    lang: (data) => data.archive?.lang || "he",
    title: (data) => data.archive?.title || "",
    description: (data) => {
      if (!data.archive) return "";
      return data.archive.lang === "he"
        ? "רשימות מחקריות, עיוני נוסח והערות על כתבי היד והמהדורה הביקורתית של ספר אור השם."
        : "Scholarly notes, textual studies, and editorial observations on the manuscripts and critical edition of Light of the Lord.";
    },
    permalink: (data) =>
      data.archive ? `${data.archive.url}index.html` : false,
    eleventyExcludeFromCollections: (data) => !data.archive,
  },
};
