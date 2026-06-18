const sanitizeHtml = require("sanitize-html");

const cleanRichText = (htmlContent) => {
  if (typeof htmlContent !== "string") return htmlContent;

  return sanitizeHtml(htmlContent, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "p",
      "a",
      "ul",
      "ol",
      "nl",
      "li",
      "b",
      "i",
      "strong",
      "em",
      "strike",
      "abbr",
      "code",
      "hr",
      "br",
      "div",
      "table",
      "thead",
      "caption",
      "tbody",
      "tr",
      "th",
      "td",
      "pre",
      "iframe",
      "img",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      iframe: [
        "src",
        "width",
        "height",
        "allowfullscreen",
        "allow",
        "frameborder",
      ],
      "*": ["class", "style"],
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
};

module.exports = { cleanRichText };
