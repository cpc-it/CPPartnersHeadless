/**
 * Returns a title for the current page.
 * @param {GeneralSettings} generalSettings The general settings node.
 * @param {string} titleOverride An optional title to be used instead of the site title.
 * @param {string} siteTitleOverride An optional site title override.
 * @returns {string} The page title.
 */
function pageTitle(generalSettings, titleOverride = null, siteTitleOverride = null) {
  const siteTitle = siteTitleOverride || generalSettings?.title || 'Cal Poly Partners';
  const title = titleOverride || siteTitle;

  if (!title) {
    return '';
  }

  if (title === siteTitle) {
    return siteTitle;
  }

  return `${title} | ${siteTitle}`;
}

export default pageTitle;
