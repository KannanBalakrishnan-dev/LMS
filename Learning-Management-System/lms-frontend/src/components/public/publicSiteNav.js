export const PUBLIC_SITE_NAV_SECTIONS = [
    { id: 'home', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'courses', label: 'Courses' },
    { id: 'contact', label: 'Contact us' },
];

const defaultNavTargetsById = {
    home: { to: '/' },
    features: { to: '/#features' },
    courses: { to: '/courses' },
    contact: { to: '/#contact' },
};

export function createPublicSiteHeaderNavItems(overrides = {}) {
    return PUBLIC_SITE_NAV_SECTIONS.map((item) => ({
        ...item,
        ...defaultNavTargetsById[item.id],
        ...(overrides[item.id] || {}),
    }));
}
