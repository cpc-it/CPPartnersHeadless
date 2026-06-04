import Link from 'next/link';
import { LoadingSearchResult } from 'components';
import { FaSearch } from 'react-icons/fa';
import { stripHtml } from 'utilities';

import styles from './SearchResults.module.scss';

const EXCERPT_LENGTH = 240;

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchTerms(searchQuery = '') {
  return [...new Set(searchQuery.match(/[^\s]+/g) ?? [])]
    .map((term) => term.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function buildExcerptText(node, searchQuery) {
  const sourceText = stripHtml(node?.excerpt || node?.content || '').trim();

  if (!sourceText) {
    return '';
  }

  const terms = buildSearchTerms(searchQuery);
  const lowerSource = sourceText.toLowerCase();
  const firstMatchIndex = terms.reduce((bestIndex, term) => {
    const currentIndex = lowerSource.indexOf(term.toLowerCase());
    if (currentIndex === -1) {
      return bestIndex;
    }

    return bestIndex === -1 ? currentIndex : Math.min(bestIndex, currentIndex);
  }, -1);

  if (sourceText.length <= EXCERPT_LENGTH) {
    return sourceText;
  }

  if (firstMatchIndex === -1) {
    return `${sourceText.slice(0, EXCERPT_LENGTH).trim()}...`;
  }

  const snippetStart = Math.max(firstMatchIndex - Math.floor(EXCERPT_LENGTH / 3), 0);
  const snippetEnd = Math.min(snippetStart + EXCERPT_LENGTH, sourceText.length);
  const prefix = snippetStart > 0 ? '...' : '';
  const suffix = snippetEnd < sourceText.length ? '...' : '';

  return `${prefix}${sourceText.slice(snippetStart, snippetEnd).trim()}${suffix}`;
}

function highlightExcerpt(text, searchQuery) {
  const safeText = escapeHtml(text);
  const terms = buildSearchTerms(searchQuery);

  if (!terms.length || !safeText) {
    return safeText;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  return safeText.replace(
    pattern,
    `<mark class="${styles.highlight}">$1</mark>`
  );
}

/**
 * Renders the search results list.
 *
 * @param {Props} props The props object.
 * @param {object[]} props.searchResults The search results list.
 * @param {boolean} props.isLoading Whether the search results are loading.
 * @param {string} props.searchQuery The current search query.
 * @returns {React.ReactElement} The SearchResults component.
 */
export default function SearchResults({
  searchResults,
  isLoading,
  searchQuery,
}) {
  // If there are no results, or are loading, return null.
  if (!isLoading && searchResults === undefined) {
    return null;
  }

  // If there are no results, return a message.
  if (!isLoading && !searchResults?.length) {
    return (
      <div className={styles['no-results']}>
        <FaSearch
          className={styles['no-results-icon']}
          aria-hidden="true"
          focusable="false"
        />
        <div className={styles['no-results-text']}>No results</div>
      </div>
    );
  }

  return (
    <>
      {searchResults?.map((node) => (
        <div key={node.databaseId} className={styles.result}>
          <Link legacyBehavior href={node.uri}>
            <a>
              <h2 className={styles.title}>{node.title}</h2>
            </a>
          </Link>
          {buildExcerptText(node, searchQuery) && (
            <div
              className={styles.excerpt}
              dangerouslySetInnerHTML={{
                __html: highlightExcerpt(
                  buildExcerptText(node, searchQuery),
                  searchQuery
                ),
              }}
            />
          )}
        </div>
      ))}

      {isLoading === true && (
        <>
          <LoadingSearchResult />
          <LoadingSearchResult />
          <LoadingSearchResult />
        </>
      )}
    </>
  );
}
