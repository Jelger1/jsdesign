// Gestructureerde gegevens (schema.org) als één samenhangende graaf per pagina.
// Organisatie, persoon en website hebben vaste @id's, zodat Google en AI-assistenten op elke pagina dezelfde
// entiteit herkennen: JS Design, de studio van Jelger Sieler in Kerkrade, voorheen JelgerS3D.
// Paginaspecifieke onderdelen (Product, FAQPage, BreadcrumbList, ...) komen uit page.jsonLd en hangen eraan.

const KNOWS_ABOUT = ['Branding', 'Logo-ontwerp', 'Huisstijl', 'UI/UX-design', 'Webdesign', 'Front-end development',
	'Interactive storytelling', 'Scrollytelling', '3D-ontwerp', '3D-printen', 'Prototyping'];

function ids(site) {
	return {
		organization: site.url + '/#organization',
		person: site.url + '/#jelger',
		website: site.url + '/#website'
	};
}

function postalAddress(site) {
	const a = site.address || {};
	return Object.assign({ '@type': 'PostalAddress', addressLocality: a.city || site.pickupLocation, addressRegion: site.region, addressCountry: 'NL' },
		a.street ? { streetAddress: a.street } : {},
		a.postcode ? { postalCode: a.postcode } : {});
}

function organization(site, ogImageUrl) {
	const id = ids(site);
	const socials = site.socials || {};
	return {
		'@type': 'ProfessionalService',
		'@id': id.organization,
		name: site.name,
		alternateName: site.formerNames || [],
		description: site.description,
		url: site.url + '/',
		logo: { '@type': 'ImageObject', url: site.url + '/assets/brand/js-logo-512.png', width: 512, height: 512 },
		image: ogImageUrl,
		founder: { '@id': id.person },
		address: postalAddress(site),
		areaServed: [{ '@type': 'AdministrativeArea', name: 'Limburg' }, { '@type': 'Country', name: 'Nederland' }],
		knowsAbout: KNOWS_ABOUT,
		vatID: site.btw,
		identifier: { '@type': 'PropertyValue', propertyID: 'KvK', value: site.kvk },
		sameAs: [socials.instagram, socials.linkedin, socials.github].filter(Boolean)
		// Bewust geen e-mailadres: dit is leesbaar voor robots die adressen verzamelen
	};
}

function person(site) {
	const id = ids(site);
	const socials = site.socials || {};
	return {
		'@type': 'Person',
		'@id': id.person,
		name: site.owner,
		jobTitle: 'Ontwerper, developer en maker',
		worksFor: { '@id': id.organization },
		sameAs: [socials.linkedin, socials.github].filter(Boolean)
	};
}

function website(site) {
	const id = ids(site);
	return {
		'@type': 'WebSite',
		'@id': id.website,
		url: site.url + '/',
		name: site.name,
		alternateName: site.formerNames || [],
		inLanguage: 'nl-NL',
		publisher: { '@id': id.organization }
	};
}

// page: het object uit een template. urls: { canonical, ogImage (deze pagina), orgImage (vast beeld van de studio) }
function graph(page, site, urls) {
	const id = ids(site);
	const webPage = {
		'@type': page.schemaType || 'WebPage',
		'@id': urls.canonical + '#webpage',
		url: urls.canonical,
		name: page.title,
		description: page.description,
		inLanguage: 'nl-NL',
		isPartOf: { '@id': id.website },
		primaryImageOfPage: { '@type': 'ImageObject', url: urls.ogImage }
	};
	if (page.name === 'home') webPage.about = { '@id': id.organization };
	const extra = (page.jsonLd || []).map(function (item) {
		const copy = Object.assign({}, item);
		delete copy['@context'];
		return copy;
	});
	return {
		'@context': 'https://schema.org',
		'@graph': [organization(site, urls.orgImage), person(site), website(site), webPage].concat(extra)
	};
}

module.exports = { graph: graph, ids: ids };
