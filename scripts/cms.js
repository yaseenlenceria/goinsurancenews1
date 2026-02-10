/**
 * Insurance Insight CMS Logic
 * Optimized for both local preview and production deployment.
 */

const { posts, categories, authors, pages } = window.INSURANCE_DATA;
const SITE_URL = 'https://www.goinsurancenews.com';

const state = {
    posts: posts.sort((a, b) => new Date(b.date) - new Date(a.date)),
    categories: categories,
    authors: authors,
    pages: pages
};

function getNormalizedPath() {
    if (window.location.protocol === 'file:') {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('p') || '/';
        return p.replace(/\/$/, '') || '/';
    }
    return normalizePath(window.location.href);
}

function formatDate(date, options) {
    return new Date(date).toLocaleDateString(undefined, options);
}

function buildUrl(path) {
    if (!path) return SITE_URL;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${SITE_URL}${normalized}`;
}

function normalizePath(url) {
    if (!url) return '/';
    try {
        const urlObj = new URL(url, window.location.origin || 'http://localhost');
        const siteHost = new URL(SITE_URL).hostname.replace('www.', '');
        const targetHost = urlObj.hostname.replace('www.', '');

        if (targetHost === siteHost || urlObj.hostname === 'localhost' || urlObj.protocol === 'file:') {
            let p = urlObj.pathname;
            if (p.endsWith('index.html')) p = p.replace('index.html', '');
            return p.replace(/\/$/, '') || '/';
        }
    } catch (e) { }
    // Handle relative paths starting with /
    if (url.startsWith('/')) return url.replace(/\/$/, '') || '/';
    return url;
}

function getPathFromUrl(url) {
    const p = normalizePath(url);
    if (p.startsWith('http')) {
        window.location.href = url;
        return null;
    }
    return p;
}

function getPathForCompare(url) {
    return normalizePath(url);
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function createSlugger() {
    const used = {};
    return (text) => {
        const base = slugify(text);
        const count = used[base] || 0;
        used[base] = count + 1;
        return count ? `${base}-${count + 1}` : base;
    };
}

function renderMarkdown(content) {
    const lines = content.split('\n');
    const parts = [];
    const toc = [];
    const slugger = createSlugger();
    let listType = null;
    let listItems = [];

    const formatInline = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\[(.+?)\]\((.+?)\)/g, (match, label, url) => {
                const isInternal = url.startsWith('/') || url.startsWith(SITE_URL);
                return `<a href="${url}"${isInternal ? ' data-link' : ' target="_blank" rel="noopener"'}>${label}</a>`;
            });
    };

    const flushList = () => {
        if (listType && listItems.length) {
            parts.push(`<${listType} class="post-list">${listItems.join('')}</${listType}>`);
        }
        listType = null;
        listItems = [];
    };

    let inTable = false;
    let tableRows = [];

    const flushTable = () => {
        if (inTable && tableRows.length) {
            const header = tableRows[0];
            const body = tableRows.slice(2); // Skip header and separator
            const thead = `<thead><tr>${header.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
            const tbody = `<tbody>${body.map(r => `<tr>${r.map((c, i) => {
                const isExpert = header[i]?.toLowerCase().includes('expert verdict');
                const label = header[i] || '';
                return `<td${isExpert ? ' class="td-expert"' : ''} data-label="${label}">${c}</td>`;
            }).join('')}</tr>`).join('')}</tbody>`;
            parts.push(`<div class="table-wrapper"><table class="post-table">${thead}${tbody}</table></div>`);
        }
        inTable = false;
        tableRows = [];
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        // Table detection
        if (trimmed.startsWith('|')) {
            inTable = true;
            const cells = trimmed
                .split('|')
                .filter((c, i, arr) => i > 0 && i < arr.length - 1)
                .map(c => formatInline(c.trim()));
            tableRows.push(cells);
            return;
        } else if (inTable) {
            flushTable();
        }

        if (trimmed === '---') {
            flushList();
            parts.push('<hr class="post-hr">');
            return;
        }

        if (line.startsWith('###')) {
            flushList();
            const text = line.replace('###', '').trim();
            const id = slugger(text);
            toc.push({ id, label: text, level: 3 });
            parts.push(`<h3 id="${id}">${formatInline(text)}</h3>`);
            return;
        }

        if (line.startsWith('##')) {
            flushList();
            const text = line.replace('##', '').trim();
            const id = slugger(text);
            toc.push({ id, label: text, level: 2 });
            parts.push(`<h2 id="${id}">${formatInline(text)}</h2>`);
            return;
        }

        if (line.match(/^\d+\.\s/)) {
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(`<li>${formatInline(line.replace(/^\d+\.\s/, '').trim())}</li>`);
            return;
        }

        if (line.startsWith('- ')) {
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(`<li>${formatInline(line.replace('- ', '').trim())}</li>`);
            return;
        }

        if (trimmed === '') {
            flushList();
            return;
        }

        flushList();
        parts.push(`<p>${formatInline(line)}</p>`);
    });

    flushList();
    flushTable();
    return { html: parts.join(''), toc };
}

function calculateReadTime(text) {
    const wordsPerMinute = 225;
    const noOfWords = text.split(/\s/g).length;
    const readTime = Math.ceil(noOfWords / wordsPerMinute);
    return `${readTime} min read`;
}

function navigate(url) {
    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.remove('active');

    const resolvedPath = getPathFromUrl(url);
    if (!resolvedPath) return;

    if (window.location.protocol === 'file:') {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('p', resolvedPath);
        window.history.pushState(null, null, currentUrl.href);
    } else {
        window.history.pushState(null, null, resolvedPath);
    }
    router();
}

function updateMetadata(path) {
    let title = 'Insurance Insight | Expert Insurance Guides & News';
    let desc = 'Get expert advice and educational guides on life, health, military, and home insurance.';
    let image = `${SITE_URL}/media/blog/thumb_health_2026_1770658729173.png`;
    const canonicalPath = path === '' ? '/' : path;

    if (path.startsWith('/post/')) {
        const postId = path.replace(/\/$/, '').split('/').pop();
        const post = state.posts.find(p => p.id === postId);
        if (post) {
            title = `${post.title} | Insurance Insight`;
            desc = post.excerpt;
            image = buildUrl(post.image);
        }
    } else if (path.startsWith('/category/')) {
        const catId = path.replace(/\/$/, '').split('/').pop();
        const cat = state.categories.find(c => c.id === catId);
        if (cat) {
            title = `${cat.name} Insurance Guides | Insurance Insight`;
            desc = cat.description;
        }
    } else if (path === '/blog') {
        title = 'Insurance Blog | Insurance Insight';
        desc = 'Browse the latest insurance guides, comparisons, and policy insights.';
    } else if (path === '/admin') {
        title = 'Admin Dashboard | Insurance Insight';
        desc = 'System administration and content management.';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', buildUrl(canonicalPath));

    const setMeta = (selector, value, attr = 'content') => {
        const tag = document.querySelector(selector);
        if (tag) tag.setAttribute(attr, value);
    };

    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', buildUrl(canonicalPath));
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', image);
}

function updateStructuredData(path) {
    const script = document.getElementById('structured-data');
    if (!script) return;

    let schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Insurance Insight',
        url: SITE_URL,
        potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/blog`,
            'query-input': 'required name=search_term_string'
        }
    };

    if (path.startsWith('/post/')) {
        const postId = path.replace(/\/$/, '').split('/').pop();
        const post = state.posts.find(p => p.id === postId);
        const author = post ? state.authors.find(a => a.id === post.author) : null;
        const category = post ? state.categories.find(c => c.id === post.category) : null;

        if (post) {
            schema = {
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                headline: post.title,
                description: post.excerpt,
                image: [buildUrl(post.image)],
                datePublished: post.date,
                dateModified: post.date,
                mainEntityOfPage: buildUrl(path),
                author: {
                    '@type': 'Person',
                    name: author ? author.name : 'Insurance Insight Editorial'
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'Insurance Insight',
                    url: SITE_URL
                },
                articleSection: category ? category.name : 'Insurance'
            };
        }
    }

    script.textContent = JSON.stringify(schema);
}

function buildRelatedLinks(post) {
    const related = state.posts
        .filter(p => p.id !== post.id && (p.category === post.category || p.author === post.author))
        .slice(0, 3);

    if (!related.length) return '';

    return `
        <section class="related-links" aria-label="Related insurance guides">
            <h3>Related reads</h3>
            <ul>
                ${related.map(item => `<li><a href="${buildUrl(`/post/${item.id}`)}" data-link>${item.title}</a></li>`).join('')}
            </ul>
        </section>
    `;
}


const BlogCard = (post) => {
    const category = state.categories.find(c => c.id === post.category);
    const dateText = formatDate(post.date, { month: 'short', day: 'numeric', year: 'numeric' });
    return `
        <article class="blog-card">
            <a class="card-media" href="${buildUrl(`/post/${post.id}`)}" data-link>
                <img src="${post.image}" alt="${post.altText || post.title}" loading="lazy">
            </a>
            <div class="card-body">
                <div class="card-meta">
                    <span class="card-category">${category ? category.name : post.category}</span>
                    <time datetime="${post.date}">${dateText}</time>
                </div>
                <h3 class="card-title"><a href="${buildUrl(`/post/${post.id}`)}" data-link>${post.title}</a></h3>
                <p class="card-excerpt">${post.excerpt}</p>
                <a href="${buildUrl(`/post/${post.id}`)}" data-link class="card-link">Read article</a>
            </div>
        </article>
    `;
};

const Sidebar = () => {
    const categoryList = state.categories.map(c => `
        <li>
            <a href="${buildUrl(`/category/${c.id}`)}" data-link>
                <span>${c.name}</span>
                <span class="count">${state.posts.filter(p => p.category === c.id).length}</span>
            </a>
        </li>
    `).join('');

    const recentPosts = state.posts.slice(0, 4).map(p => `
        <li class="recent-post-item">
            <a href="${buildUrl(`/post/${p.id}`)}" data-link>
                <img src="${p.image}" alt="${p.altText || p.title}">
            </a>
            <div>
                <h6><a href="${buildUrl(`/post/${p.id}`)}" data-link>${p.title}</a></h6>
                <small>${formatDate(p.date, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
            </div>
        </li>
    `).join('');

    return `
        <aside class="sidebar">
            <div class="sidebar-box">
                <h4>Browse Topics</h4>
                <ul class="category-list">
                    ${categoryList}
                </ul>
            </div>
            <div class="sidebar-box">
                <h4>Latest Articles</h4>
                <ul class="recent-list">
                    ${recentPosts}
                </ul>
            </div>
            <div class="ad-slot">Ad placement available</div>
        </aside>
    `;
};

const Breadcrumbs = (items) => {
    return `
        <div class="breadcrumbs-outer">
            <div class="container">
                <div class="breadcrumbs">
                    <a href="${buildUrl('/')}" data-link>Home</a>
                    ${items.map(item => `
                        <span class="breadcrumb-item">${item.link ? `<a href="${item.link}" data-link>${item.label}</a>` : `<span>${item.label}</span>`}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

function renderHome(content, hero) {
    const featuredPosts = state.posts.filter(p => p.featured).slice(0, 3);
    const latestPosts = state.posts.filter(p => !p.featured).slice(0, 6);
    const heroPost = featuredPosts[0] || state.posts[0];
    const heroCategory = heroPost ? state.categories.find(c => c.id === heroPost.category) : null;

    hero.innerHTML = `
        <section class="hero">
            <div class="container hero-grid">
                <div>
                    <span class="eyebrow">Insurance Insight Editorial</span>
                    <h1>Clear insurance guidance for life, health, home, and auto decisions.</h1>
                    <p>We publish practical, plain-language coverage guides so you can compare policies with confidence and protect what matters most.</p>
                    <div class="hero-actions">
                        <a href="${buildUrl('/blog')}" class="btn btn-primary" data-link>Read the latest</a>
                        <a href="${buildUrl('/about')}" class="btn btn-secondary" data-link>How we review</a>
                    </div>
                </div>
                <div class="hero-card">
                    ${heroPost ? `
                        <div>
                            <span class="eyebrow">Featured guide</span>
                            <h3><a href="${buildUrl(`/post/${heroPost.id}`)}" data-link>${heroPost.title}</a></h3>
                            <p class="card-excerpt">${heroPost.excerpt}</p>
                        </div>
                        <div class="hero-card-meta">
                            <span>${heroCategory ? heroCategory.name : 'Insurance'}</span>
                            <span>${formatDate(heroPost.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>${calculateReadTime(heroPost.content)}</span>
                        </div>
                        <a href="${buildUrl(`/post/${heroPost.id}`)}" data-link class="card-link">Read featured article</a>
                    ` : ''}
                    <div class="hero-stat-grid">
                        <div class="hero-stat">
                            <strong>150+ guides</strong>
                            <span>Updated throughout the year</span>
                        </div>
                        <div class="hero-stat">
                            <strong>Editorial review</strong>
                            <span>Checked by insurance specialists</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    const categoryCards = state.categories.map(c => `
        <a class="category-card" href="${buildUrl(`/category/${c.id}`)}" data-link>
            <span>${c.icon}</span>
            <h3>${c.name}</h3>
            <p>${c.description}</p>
        </a>
    `).join('');

    content.innerHTML = `
        <section class="section">
            <div class="container">
                <div class="section-title">
                    <div>
                        <span class="eyebrow">Featured insights</span>
                        <h2>Essential insurance reads</h2>
                    </div>
                    <p>High-impact guides and comparisons curated by our editorial team.</p>
                </div>
                <div class="grid">
                    ${featuredPosts.map(BlogCard).join('')}
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="section-title">
                    <div>
                        <span class="eyebrow">Browse by category</span>
                        <h2>Find the coverage you need</h2>
                    </div>
                    <p>Focused collections for every major insurance decision.</p>
                </div>
                <div class="category-grid">
                    ${categoryCards}
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="section-title">
                    <div>
                        <span class="eyebrow">Latest updates</span>
                        <h2>Fresh from the newsroom</h2>
                    </div>
                    <p>New research, comparisons, and coverage tips published weekly.</p>
                </div>
                <div class="main-layout-split">
                    <div class="grid">
                        ${latestPosts.map(BlogCard).join('')}
                    </div>
                    ${Sidebar()}
                </div>
            </div>
        </section>
    `;
}

function renderCategory(content, hero, categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return render404(content);

    hero.innerHTML = `
        <section class="hero hero-compact">
            <div class="container hero-center">
                <span class="eyebrow">Browse category</span>
                <h1>${category.name}</h1>
                <p>${category.description}</p>
            </div>
        </section>
    `;

    const categoryPosts = state.posts.filter(p => p.category === categoryId);

    content.innerHTML = `
        ${Breadcrumbs([{ label: category.name }])}
        <section class="section">
            <div class="container">
                <div class="main-layout-split">
                    <div class="grid">
                        ${categoryPosts.length > 0 ? categoryPosts.map(BlogCard).join('') : '<p class="empty-state">Our insurance experts are drafting new articles for this category.</p>'}
                    </div>
                    ${Sidebar()}
                </div>
            </div>
        </section>
    `;
}

function renderBlogListing(content, hero) {
    hero.innerHTML = `
        <section class="hero hero-compact">
            <div class="container hero-center">
                <span class="eyebrow">Insurance blog</span>
                <h1>All articles and guides</h1>
                <p>Explore our complete library of insurance insights, comparisons, and expert checklists.</p>
            </div>
        </section>
    `;

    content.innerHTML = `
        <section class="section">
            <div class="container">
                <div class="section-title">
                    <div>
                        <span class="eyebrow">Latest stories</span>
                        <h2>Browse the full archive</h2>
                    </div>
                    <p>Sort by category or dive into the newest editorial research.</p>
                </div>
                <div class="grid">
                    ${state.posts.map(BlogCard).join('')}
                </div>
            </div>
        </section>
    `;
}

function renderPost(content, postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return render404(content);

    const category = state.categories.find(c => c.id === post.category);
    const author = state.authors.find(a => a.id === post.author);
    const readTime = calculateReadTime(post.content);
    const updatedDate = post.updated || post.date;
    const { html, toc } = renderMarkdown(post.content);

    const tocMarkup = toc.length
        ? `
            <nav class="toc-card">
                <h4>Table of contents</h4>
                <ul class="toc-list">
                    ${toc.map(item => `<li class="toc-item toc-level-${item.level}"><a href="#${item.id}">${item.label}</a></li>`).join('')}
                </ul>
            </nav>
        `
        : '';

    const isLoggedIn = localStorage.getItem('admin_session') === 'true';
    const adminActionMarkup = isLoggedIn
        ? `<div class="admin-post-controls container"><a href="${buildUrl('/admin')}" class="btn btn-secondary btn-compact" data-link>Edit in Dashboard</a></div>`
        : '';

    content.innerHTML = `
        ${adminActionMarkup}
        <header class="post-header-hero">
            <div class="container">
                <div class="post-header-inner">
                    <div>
                        <a href="${buildUrl(`/category/${category.id}`)}" class="post-topic-link" data-link>${category.name}</a>
                        <h1 class="post-title-main">${post.title}</h1>
                        <div class="post-meta">
                            <span>By <strong>${author.name}</strong></span>
                            <span>Published ${formatDate(post.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <span>Updated ${formatDate(updatedDate, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <span>${readTime}</span>
                        </div>
                    </div>
                    <div class="post-featured-wrapper">
                        <img src="${post.image}" alt="${post.altText || post.title}">
                    </div>
                </div>
            </div>
        </header>

        ${Breadcrumbs([
        { label: category.name, link: buildUrl(`/category/${category.id}`) },
        { label: post.title }
    ])}

        <section class="section">
            <div class="container">
                <div class="main-layout-split">
                    <div class="post-body-wrapper">
                        ${tocMarkup}
                        <div class="post-content-rich">
                            <p class="quick-answer"><strong>Quick answer:</strong> ${post.excerpt}</p>
                            ${html}
                            ${buildRelatedLinks(post)}
                        </div>
                        <div class="ad-slot">In-article ad placement</div>
                        <div class="author-card">
                            <img src="${author.avatar}" alt="${author.name}">
                            <div>
                                <h3>About ${author.name}</h3>
                                <p>${author.bio}</p>
                            </div>
                        </div>
                        <div class="related-articles">
                            <h3>Recommended next reads</h3>
                            <div class="grid">
                                ${state.posts.filter(p => p.category === post.category && p.id !== post.id).slice(0, 2).map(BlogCard).join('')}
                            </div>
                        </div>
                    </div>
                    ${Sidebar()}
                </div>
            </div>
        </section>
    `;
}

function renderStaticPage(content, type) {
    const page = state.pages[type];
    content.innerHTML = `
        <section class="page-standard">
            <div class="container">
                <div class="page-box">
                    <span class="eyebrow">Our policy</span>
                    <h1>${page.title}</h1>
                    <div class="page-body">
                        ${renderMarkdown(page.content).html}
                    </div>
                </div>
            </div>
        </section>
    `;
}

function render404(content) {
    content.innerHTML = `
        <section class="section">
            <div class="container">
                <div class="loading-state">
                    <h1>404</h1>
                    <h2>We could not locate that page.</h2>
                    <p>The insurance guide you requested might have moved. Try the homepage or the blog archive.</p>
                    <a href="${buildUrl('/')}" data-link class="btn btn-primary">Return to Home</a>
                </div>
            </div>
        </section>
    `;
}

function renderAdmin(content, hero) {
    hero.innerHTML = `
        <section class="hero hero-compact">
            <div class="container hero-center">
                <span class="eyebrow">Terminal Access</span>
                <h1>Admin Intelligence</h1>
                <p>Manage your ecosystem, track insights, and deploy new content with precision.</p>
            </div>
        </section>
    `;

    const isLoggedIn = localStorage.getItem('admin_session') === 'true';

    if (!isLoggedIn) {
        content.innerHTML = `
            <div class="container">
                <div class="admin-login-wrapper">
                    <div class="login-card">
                        <h2>Welcome Back</h2>
                        <p>Authenticate to access the command center.</p>
                        <form id="login-form">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" class="form-control" name="username" placeholder="Enter admin username" required>
                            </div>
                            <div class="form-group">
                                <label>Security Key</label>
                                <input type="password" class="form-control" name="password" placeholder="••••••••" required>
                            </div>
                            <button type="submit" class="btn btn-primary btn-full">Access Dashboard</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const form = document.getElementById('login-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(form);
            if (data.get('username') === 'admin' && data.get('password') === 'frown2026') {
                localStorage.setItem('admin_session', 'true');
                router();
            } else {
                alert('Invalid credentials. Please try again.');
            }
        });
        return;
    }

    const stats = [
        { label: 'Total Posts', value: state.posts.length },
        { label: 'Categories', value: state.categories.length },
        { label: 'Featured', value: state.posts.filter(p => p.featured).length },
        { label: 'Total Authors', value: state.authors.length }
    ];

    const postsHtml = state.posts.map(p => `
        <tr>
            <td>
                <div style="font-weight: 600;">${p.title}</div>
                <div class="post-id">${p.id}</div>
            </td>
            <td>${formatDate(p.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td><span class="post-topic-link" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">${p.category}</span></td>
            <td>
                <span class="post-status ${p.featured ? 'post-featured' : ''}">
                    ${p.featured ? 'Featured' : 'Published'}
                </span>
            </td>
            <td>
                <div class="admin-actions">
                    <button class="btn-icon" title="Edit Post"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                    <button class="btn-icon" title="Delete Post"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                </div>
            </td>
        </tr>
    `).join('');

    content.innerHTML = `
        <div class="container admin-dashboard">
            <div class="dashboard-header">
                <div>
                    <h2>System Overview</h2>
                    <p class="ink-500">Managing global insurance content nodes.</p>
                </div>
                <div class="admin-actions">
                    <button class="btn btn-secondary" id="logout-btn">Logout Session</button>
                    <button class="btn btn-primary">+ Create New Post</button>
                </div>
            </div>

            <div class="dashboard-stats">
                ${stats.map(s => `
                    <div class="stat-card">
                        <span class="label">${s.label}</span>
                        <span class="value">${s.value}</span>
                    </div>
                `).join('')}
                <div class="stat-card accent">
                    <span class="label">Cloud Status</span>
                    <span class="value">Active</span>
                </div>
            </div>

            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Content Details</th>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${postsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('admin_session');
        router();
    });
}

function router() {
    const content = document.getElementById('content');
    const hero = document.getElementById('hero-container');
    const path = getNormalizedPath();

    content.innerHTML = '';
    hero.innerHTML = '';
    document.body.classList.remove('nav-open');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);

    document.querySelectorAll('nav a').forEach(a => {
        const href = a.getAttribute('href');
        const hrefPath = getPathForCompare(href);
        let isActive = hrefPath === path;

        if (path.startsWith('/category/')) {
            const categoryId = path.split('/').pop();
            isActive = hrefPath === `/category/${categoryId}`;
        }

        if (path.startsWith('/post/')) {
            isActive = hrefPath === '/blog';
        }

        if (path === '/blog') {
            isActive = hrefPath === '/blog';
        }

        if (isActive) a.classList.add('active');
        else a.classList.remove('active');
    });

    if (path === '/' || path === '/index.html') {
        renderHome(content, hero);
    } else if (path === '/blog') {
        renderBlogListing(content, hero);
    } else if (path === '/admin') {
        renderAdmin(content, hero);
    } else if (path.startsWith('/category/')) {
        const categoryId = path.replace(/\/$/, '').split('/').pop();
        renderCategory(content, hero, categoryId);
    } else if (path.startsWith('/post/')) {
        const postId = path.replace(/\/$/, '').split('/').pop();
        renderPost(content, postId);
    } else if (path.startsWith('/')) {
        const pageKey = path.substring(1);
        if (state.pages[pageKey]) {
            renderStaticPage(content, pageKey);
        } else {
            render404(content);
        }
    } else {
        render404(content);
    }

    updateMetadata(path);
    updateStructuredData(path);
}


function init() {
    const footerCats = document.getElementById('footer-categories');
    footerCats.innerHTML = state.categories.map(c => `
        <li><a href="${buildUrl(`/category/${c.id}`)}" data-link>${c.name}</a></li>
    `).join('');

    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();

            const nav = document.getElementById('main-nav');
            const menuToggle = document.getElementById('menu-toggle');
            if (nav) nav.classList.remove('active');
            document.body.classList.remove('nav-open');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');

            const url = link.getAttribute('href');
            navigate(url);
        }
    });

    window.addEventListener('popstate', router);
    router();

    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const nav = document.getElementById('main-nav');
            if (nav) {
                nav.classList.toggle('active');
                const isOpen = nav.classList.contains('active');
                document.body.classList.toggle('nav-open', isOpen);
                menuToggle.setAttribute('aria-expanded', String(isOpen));
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const nav = document.getElementById('main-nav');
                if (nav && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    document.body.classList.remove('nav-open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }
}

if (window.INSURANCE_DATA) {
    init();
}
