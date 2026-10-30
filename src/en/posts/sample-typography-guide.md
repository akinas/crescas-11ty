---
title: "Scribal Corrections in the Florence Manuscript: A Typographical Guide"
blurb: "A sample scholarly note demonstrating every typographical element available in Markdown — headings, marginal asides, attributed blockquotes, apparatus boxes, figures with captions, and footnotes."
date: 2026-10-30
author: "Daniel Levin"
categories:
  - Manuscripts
  - Textual Criticism
tags:
  - Florence Manuscript
  - Critical Edition
  - Typography
translationKey: "sample-typography-guide"
dropcap: true
draft: true
---

::: lead
Lead paragraph (`::: lead`): The Florence manuscript (Ms. Conv. Soppr. 417) preserves remarkable layers of early textual revision from the circle of Rabbi Hasdai Crescas. This file serves as a living template for authoring new notes in Markdown — remove `draft: true` from the frontmatter to publish.
:::

In editing medieval Hebrew philosophical treatises, distinguishing mechanical scribal slips from deliberate authorial revisions requires close paleographical and philological scrutiny[^1]. Whereas the *editio princeps* printed in Ferrara (1551) served for centuries as the base text of subsequent editions, returning to the earliest fifteenth-century manuscripts reveals a markedly cleaner and coherent argument.

## Section Headings and Subheadings

### Marginal Glosses and First-Hand Corrections

Primary sections use `##`, subsections use `###`, and rubricated minor subheadings use `####`. Every heading automatically receives a clean `id` attribute for direct anchor links.

::: aside Marginal Note (Aside)
Asides are written with `::: aside Optional Title`. On wide desktop screens they sit gracefully in the outer margin like classical manuscript glosses; on smaller viewports they tuck neatly into the reading column.
:::

When collating Book I of *Light of the Lord*, key variant readings can be highlighted inline using `==highlighted text==`, alongside strikethrough deletions like ~~corrupted print reading~~ vs. ==restored manuscript reading==[^2].

#### Omissions by Homoioteleuton

Where a copyist's eye skipped from one occurrence of a recurring philosophical term to the next, the Florence manuscript frequently preserves the missing clause in a contemporary marginal hand.

## Attributed Blockquotes

Standard Markdown `>` blockquotes automatically format a trailing `— Citation` line as a semantic `<cite>` footer:

> Maimonides relied in these demonstrations upon the physical premises of the philosophers to establish the existence, unity, and incorporeality of God, supposing that through them apodictic certainty could be attained.
> — Light of the Lord, Book I, Part I

---

## Callout and Apparatus Boxes

Four scholarly box styles are available via fenced `:::` blocks:

::: box Parchment Box (`::: box`)
Ideal for methodological remarks, historical context, or excursuses. Standard Markdown—including **bold**, *italics*, [links](/en/docs/about/), and lists—works naturally inside any container.
:::

::: manuscript Critical Apparatus (`::: manuscript` or `::: apparatus`)
**MS Florence (F):** *for place is defined by the surrounding surface...*  
**Ferrara 1551 (P):** *for place [om. one clause] by the surface...*
:::

::: important Editorial Conclusion (`::: important`)
Collation across the primary Spanish witnesses confirms that the Ferrara 1551 print descends from a secondary textual branch and should not override unanimous early manuscript testimony.
:::

::: note Further Reading (`::: note`)
See [About the Editor](/en/docs/about/) for an overview of the editorial methodology behind this project.
:::

## Images and Captions

Any standalone Markdown image given a quoted title — `![Alt text](url "Caption text")` — automatically renders as a framed `<figure>` with `<figcaption>`:

![Cover of Light of the Lord — Critical Edition](https://res.cloudinary.com/dyj4i2vhr/image/upload/f_auto,q_auto,w_800/v1787847075/crescas_revised_cover_2026_07_13_front_f6jxw0.jpg "Critical Edition of *Light of the Lord* (Ohr HaShem), established on the Florence manuscript.")

Prefixing alt text with `wide:` (or wrapping multiple images in `::: figure wide | Caption`) expands the plate beyond the text measure on desktop screens.

## Comparison Tables

| Witness | Date | Script | Editorial Role |
| --- | --- | --- | --- |
| MS Florence 417 | 15th c. | Sephardic–Provençal | Base text |
| MS Vatican ebr. 261 | 15th c. | Sephardic | Collation witness |
| Ferrara Print | 1551 | Printed | *Editio princeps* |

[^1]: On the history and hands of Biblioteca Medicea Laurenziana, MS Conv. Soppr. 417, see the Hebrew introduction to the critical edition, pp. 11–28.
[^2]: Multiple references to the same footnote work automatically as well.
