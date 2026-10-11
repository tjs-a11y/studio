// Erreurs des fichiers de parcelles RDUE (français). Mêmes faits que eudr-en.mjs : pages d'aide du Système d'information
// de l'UE (ouvertes le 11 octobre 2026, en anglais) et comportement documenté du vérificateur (/plot-file-checker/README.md).
import { SRC as EN } from './eudr-en.mjs';

const SRC = {
  geo: { label: 'Système d\'information RDUE, « GeoJSON File Description » (mise à jour du 17 août 2026, en anglais)', url: EN.geo.url },
  val: { label: 'Système d\'information RDUE, « API and UI Validation Rules » (en anglais)', url: EN.val.url },
  faq: { label: 'Système d\'information RDUE, FAQ opérateurs (en anglais)', url: EN.faq.url },
  dds: { label: 'Système d\'information RDUE, référence API de la déclaration de diligence raisonnée V3 (en anglais)', url: EN.dds.url },
  home: { label: 'Système d\'information RDUE, accueil de la documentation opérateurs (en anglais)', url: EN.home.url },
  tool: { label: 'Vérificateur de fichiers de parcelles RDUE de Quickwell, tableau des règles', url: '/plot-file-checker/' },
};
const GEO = `<a href="${SRC.geo.url}" rel="noopener" hreflang="en">GeoJSON File Description</a>`;
const VAL = `<a href="${SRC.val.url}" rel="noopener" hreflang="en">Validation Rules</a>`;
const L = (slug, text) => `<a href="/fr/learn/eudr/${slug}/">${text}</a>`;

export const SECTION = {
  path: '/fr/learn/eudr/', alt: '/learn/eudr/', altLang: 'en',
  name: 'Erreurs de fichiers RDUE',
  h1: 'Erreurs des fichiers de parcelles RDUE, et comment corriger chacune',
  title: 'Erreurs GeoJSON RDUE (EUDR) expliquées : problèmes de fichiers de parcelles et corrections',
  description: 'Pourquoi un fichier de géolocalisation RDUE (GeoJSON) est refusé par le Système d\'information de l\'UE : coordonnées inversées, décimales, polygones ouverts ou croisés, trous, points de plus de 4 ha, taille, noms de propriétés.',
  lang: 'fr', crumbs: [{ name: 'Quickwell', path: '/' }],
  lede: 'Les fichiers de géolocalisation des parcelles pour le règlement européen sur la déforestation (RDUE, ou EUDR en anglais) sont des fichiers GeoJSON aux règles strictes. Chaque page ci-dessous explique une erreur courante, ce qu\'en dit le Système d\'information de l\'UE et comment la corriger.',
  intro: `<p>Selon le règlement (UE) 2023/1115, les opérateurs qui mettent sur le marché de l'UE des produits issus des bovins, du cacao, du café, du palmier à huile, du caoutchouc, du soja ou du bois déposent une déclaration de diligence raisonnée (DDR, « DDS » en anglais) dans le Système d'information de l'UE, avec la géolocalisation des parcelles où la marchandise a été produite (<a href="${SRC.home.url}" rel="noopener" hreflang="en">documentation du Système d'information</a>). La géolocalisation est envoyée sous forme de fichier GeoJSON, que le système contrôle selon les règles techniques publiées dans ses pages ${GEO} et ${VAL}.</p>
<p>Ces pages expliquent chaque règle simplement, pour les exportateurs, coopératives et consultants qui préparent les fichiers de parcelles. Tous les faits viennent de ces pages officielles, rédigées en anglais ; lorsque la documentation de l'UE ne dit rien, la page le précise. Elles ne traitent pas du risque de déforestation lui-même, seulement de la validité technique du fichier.</p>`,
  groups: [
    { title: 'Coordonnées', slugs: ['coordinate-system-wgs84', 'swapped-coordinates', 'six-decimal-places'] },
    { title: 'Forme des polygones', slugs: ['unclosed-polygon', 'self-intersecting-polygon', 'polygon-holes'] },
    { title: 'Types de géométrie et points', slugs: ['point-area-over-4-hectares', 'linestring-not-accepted', 'geometrycollection'] },
    { title: 'Fichier et propriétés', slugs: ['property-names', 'file-size-limit'] },
  ],
  outro: '<p class="note">Vérifié le 11 octobre 2026 à partir des pages d\'aide du Système d\'information de l\'UE. Les dates d\'application du règlement ne sont pas traitées ici : consultez le calendrier officiel de la Commission européenne.</p>',
  sources: [SRC.geo, SRC.val, SRC.faq, SRC.dds, SRC.home, SRC.tool],
  cta: { title: 'Vérifiez un fichier de parcelles gratuitement', text: 'Déposez un fichier GeoJSON, KML ou CSV dans le vérificateur de fichiers de parcelles RDUE. Il signale chaque problème de cette liste, corrige ceux qui peuvent l\'être sans risque (fermeture des contours, décimales, noms de propriétés, inversions évidentes) et fournit un GeoJSON corrigé. En français ou en anglais ; rien n\'est envoyé.', href: '/plot-file-checker/', label: 'Ouvrir le vérificateur' },
};

export const PAGES = [
{ slug: 'coordinate-system-wgs84', alt: '/learn/eudr/coordinate-system-wgs84/', h1: 'Mauvais système de coordonnées : les fichiers RDUE doivent être en WGS 84 longitude/latitude', crumbName: 'Système de coordonnées (WGS 84)', short: 'Coordonnées projetées, membre crs ou valeurs hors limites.',
  title: 'RDUE GeoJSON : système de coordonnées WGS 84 (EPSG:4326) uniquement',
  description: 'Le Système d\'information de l\'UE n\'accepte les coordonnées des parcelles qu\'en WGS 84 (EPSG:4326), en degrés décimaux, longitude d\'abord. Comment repérer des coordonnées en mètres, hors limites ou à 0,0, et comment les convertir.',
  lede: 'Le Système d\'information de l\'UE ne lit les coordonnées des parcelles que dans un seul système : WGS 84 (EPSG:4326), en degrés décimaux. Des coordonnées en mètres ou dans un système national ne sont pas converties pour vous.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} indique que le GeoJSON utilise le système géodésique mondial 1984 (WGS 84), avec la longitude et la latitude en degrés décimaux, et que la première version en production du système accepte exclusivement ce format. Si vos coordonnées sont dans un autre système, elles doivent être converties en WGS 84 (EPSG:4326) avant l'envoi. La prise en charge d'autres systèmes est « reportée à des versions futures ». Les mêmes règles s'appliquent à l'interface web et à l'API.</p>
<p>Les coordonnées doivent aussi être dans les limites : latitude entre -90 et 90, longitude entre -180 et 180. Une « plage de coordonnées invalide » figure parmi les erreurs courantes listées par l'UE, et les ${VAL} exigent des valeurs de latitude et de longitude dans les limites.</p>
<h2>Comment reconnaître le problème</h2>
<ul>
<li><b>De grands nombres</b>, comme <code>[512340.25, 732118.90]</code> : ce sont des coordonnées projetées en mètres (une zone UTM ou un système national), pas des degrés.</li>
<li><b>Un membre <code>crs</code></b> en tête de fichier qui désigne autre chose que WGS 84, souvent laissé par un logiciel SIG.</li>
<li><b>Des points à 0,0</b>, dans le golfe de Guinée. Cela signale en général un relevé GPS raté qui a écrit des zéros, pas une vraie parcelle.</li>
<li><b>Des valeurs supérieures à 90</b> à la place de la latitude : parfois un problème de projection, parfois des ${L('swapped-coordinates', 'coordonnées inversées')}.</li>
</ul>
<h2>Comment corriger</h2>
<ol>
<li>Identifiez le système dans lequel les données ont été collectées ou enregistrées : les paramètres de votre application de cartographie ou de votre projet SIG l'indiquent.</li>
<li>Dans QGIS (gratuit), ouvrez la couche, puis « Exporter, Sauvegarder les entités sous », choisissez GeoJSON et le SCR <b>EPSG:4326 - WGS 84</b>. L'export reprojette les coordonnées.</li>
<li>Contrôlez quelques parcelles sur une carte après l'export : elles doivent tomber sur les exploitations, pas en mer.</li>
<li>Supprimez les points à 0,0 et les parcelles sans coordonnées, et relevez ces parcelles à nouveau.</li>
</ol>
<h2>Ce que fait le vérificateur</h2>
<p>Un membre <code>crs</code> qui déclare WGS 84 est un avertissement, et il est retiré du fichier corrigé ; un <code>crs</code> qui désigne un autre système est une erreur, car la reprojection demande un logiciel SIG. Des coordonnées qui ressemblent à des mètres, ou hors limites, sont des erreurs. Les points à 0,0, NaN ou manquants sont des erreurs, et ceux qui sont illisibles sont exclus du fichier corrigé. Le vérificateur ne reprojette pas, volontairement : deviner le système d'origine pourrait déplacer toutes les parcelles au mauvais endroit.</p>
<h2>Pourquoi la précision compte</h2>
<p>La <a href="${SRC.faq.url}" rel="noopener" hreflang="en">FAQ</a> de l'UE définit la géolocalisation RDUE comme des coordonnées de latitude et de longitude avec au moins 6 décimales. Six décimales de degré représentent environ 0,11 m au sol à l'équateur (<b>estimation</b> : environ 111 km par degré × 0,000001). Une erreur de système ou de projection de plusieurs dizaines de mètres dépasse donc de loin la précision annoncée par le fichier. Convertissez une seule fois, avec soin, à partir des données d'origine.</p>`,
  sources: [SRC.geo, SRC.val, SRC.faq, SRC.tool], related: ['swapped-coordinates', 'six-decimal-places', 'property-names'] },

{ slug: 'swapped-coordinates', alt: '/learn/eudr/swapped-coordinates/', h1: 'Coordonnées inversées : latitude et longitude dans le mauvais ordre', crumbName: 'Coordonnées inversées', short: 'Le GeoJSON veut la longitude d\'abord ; les tableurs mettent souvent la latitude d\'abord.',
  title: 'RDUE GeoJSON : coordonnées inversées, la longitude vient en premier',
  description: 'En GeoJSON, chaque position s\'écrit [longitude, latitude]. Les fichiers issus de tableurs inversent souvent l\'ordre et placent les parcelles dans un autre pays ou en mer. Comment repérer et corriger sans risque.',
  lede: 'En GeoJSON, chaque position s\'écrit longitude d\'abord, puis latitude. Les fichiers construits à partir de tableurs ou d\'exports GPS inversent souvent l\'ordre, ce qui peut placer une cacaoyère dans l\'océan ou dans un autre pays.',
  body: `
<h2>La règle</h2>
<p>La page ${GEO} de l'UE précise qu'une position est un tableau d'au moins deux nombres, dans l'ordre <b>longitude, latitude</b> pour les coordonnées du système EPSG:4326. C'est l'inverse de la manière dont on énonce souvent des coordonnées (« 5,3° N, 4,0° O ») et de la plupart des tableurs (une colonne latitude, puis une colonne longitude).</p>
<h2>À quoi ressemblent des coordonnées inversées</h2>
<p>Une parcelle près d'Abidjan, en Côte d'Ivoire, se trouve vers la latitude 5,3 et la longitude -4,0. En GeoJSON, cela s'écrit <code>[-4.0, 5.3]</code>. Écrit <code>[5.3, -4.0]</code>, le système lit une longitude de 5,3 et une latitude de -4,0 : un point dans l'Atlantique, au sud du Nigeria. Les nombres sont corrects, mais au mauvais endroit.</p>
<p>Parfois l'inversion saute aux yeux : un café éthiopien vers la latitude 7 et la longitude 38 se retrouve à la latitude 38, autour de la Méditerranée. Parfois elle est discrète : près de l'équateur et du méridien d'origine, les deux ordres peuvent tomber sur la terre ferme. Le Ghana et la Côte d'Ivoire, où beaucoup de parcelles de cacao se situent entre 5 et 8 de latitude et -8 et 0 de longitude, sont le cas typique.</p>
<h2>Comment contrôler votre fichier</h2>
<ol>
<li>Ouvrez le fichier sur une carte (QGIS, geojson.io ou un autre outil SIG) et regardez où tombent les parcelles.</li>
<li>Comparez avec la propriété ProducerCountry, si elle existe. Une parcelle notée CI qui apparaît en mer ou dans un autre pays est suspecte.</li>
<li>Regardez les nombres : une valeur supérieure à 90 ou inférieure à -90 en deuxième position ne peut pas être une latitude.</li>
</ol>
<h2>Comment corriger</h2>
<p>Si tout le fichier est inversé, exportez-le à nouveau depuis la source en associant correctement les colonnes : longitude en X, latitude en Y. Ne corrigez pas parcelle par parcelle sans savoir lesquelles sont fausses : un fichier peut mélanger des parcelles correctes et inversées quand les données viennent de plusieurs enquêteurs.</p>
<h2>Ce que fait le vérificateur</h2>
<p>Le vérificateur utilise des contours approximatifs des pays pour décider si une parcelle est inversée. Il ne l'inverse automatiquement que dans les cas clairs : la latitude n'est hors limites que dans l'ordre donné ; le pays ProducerCountry de la parcelle (ou le pays que vous choisissez) contient le point inversé mais pas l'original ; ou, sans pays indiqué, le point d'origine ne tombe dans aucune région de production connue et le point inversé tombe dans le principal pays producteur du fichier. Quand les deux ordres sont plausibles, il marque la parcelle « peut-être inversée » et vous demande de choisir le pays, puis corrige. Il avertit aussi pour toute parcelle située hors de son pays ProducerCountry.</p>
<h2>Pour la prochaine campagne</h2>
<p>En préparant un formulaire de collecte ou un modèle de tableur, nommez les colonnes <code>longitude</code> et <code>latitude</code> explicitement, pas « X/Y » ni « coord1/coord2 », et testez une parcelle connue de bout en bout avant le début de la campagne.</p>`,
  sources: [SRC.geo, SRC.tool], related: ['coordinate-system-wgs84', 'six-decimal-places', 'property-names'] },

{ slug: 'six-decimal-places', alt: '/learn/eudr/six-decimal-places/', h1: 'Décimales : au moins 6, et l\'effet de la troncature sur vos polygones', crumbName: 'Six décimales', short: 'Trop peu de décimales, et doublons créés par la troncature.',
  title: 'Coordonnées RDUE : 6 décimales minimum et doublons dus à la troncature',
  description: 'La géolocalisation RDUE exige au moins 6 décimales, et le Système d\'information de l\'UE tronque tout ce qui dépasse 6. Pourquoi trop peu de décimales posent problème et comment la troncature crée des points en double.',
  lede: 'La géolocalisation RDUE doit comporter au moins 6 décimales. Le Système d\'information de l\'UE coupe aussi tout ce qui dépasse 6 décimales, ce qui peut créer sans bruit des points en double et des formes invalides.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<ul>
<li>La <a href="${SRC.faq.url}" rel="noopener" hreflang="en">FAQ</a> définit la géolocalisation comme des coordonnées de latitude et de longitude « avec un minimum de 6 décimales ». La référence de l'API DDR le répète.</li>
<li>La page ${GEO} indique que le système <b>tronque les coordonnées à 6 décimales</b> avant de les enregistrer, qu'envoyer davantage est « superflu », et que dans des cas extrêmes cela peut même rendre invalide une géométrie qui était valide. Les ${VAL} disent la même chose.</li>
<li>Sa liste d'erreurs courantes cite les « coordonnées en double dues à la troncature à 6 décimales », avec un exemple : <code>-5.8227391234, 144.2567071234</code> et <code>-5.8227394567, 144.2567074567</code> deviennent tous deux <code>-5.822739, 144.256707</code>.</li>
</ul>
<h2>Trop peu de décimales</h2>
<p>Une coordonnée comme <code>-4.02, 5.31</code> n'a que deux décimales : elle ne situe un point qu'à environ un kilomètre près. Les fichiers perdent des décimales quand une colonne de tableur est formatée pour en afficher 2 ou 4 puis enregistrée en CSV, ou quand une application exporte des valeurs arrondies. Un nouvel export ne rend pas la précision perdue : il faut les données d'origine ou un nouveau relevé GPS.</p>
<p>Une subtilité : les outils JSON suppriment les zéros finaux, donc <code>-49.00683</code> peut en réalité valoir <code>-49.006830</code>. Le fichier d'exemple de l'UE contient de telles valeurs. Un contrôle équitable regarde la valeur la plus longue d'une parcelle, pas chaque nombre isolément.</p>
<h2>Trop de décimales</h2>
<p>Envoyer 10 ou 15 décimales n'est pas grave en soi, mais à cause de la troncature, deux sommets distants de 0,0000003 degré deviennent le même point. Un polygone avec des sommets répétés, ou dont les sommets s'alignent, peut alors devenir invalide. La solution : tronquer vous-même à 6 décimales, puis supprimer les points consécutifs en double, pour contrôler le résultat avant le système.</p>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>Moins de 6 décimales (jugé sur la valeur la plus longue de chaque parcelle) : erreur. Le fichier corrigé écrit 6 décimales, mais le vérificateur avertit encore d'une faible précision GPS si les données avaient 4 décimales ou moins, car ajouter des zéros n'ajoute pas d'exactitude.</li>
<li>Plus de 6 décimales : tronqué à 6, comme le fait le système de l'UE. Les doublons ainsi créés sont supprimés et la parcelle est contrôlée à nouveau.</li>
<li>Points consécutifs répétés : avertissement, supprimés dans le fichier corrigé.</li>
</ul>
<h2>Bonne pratique</h2>
<p>Conservez les données GPS brutes en pleine précision dans vos propres archives, et produisez le fichier d'envoi à partir d'elles avec exactement 6 décimales. Formatez les colonnes de coordonnées du tableur en texte, ou avec au moins 6 décimales, pour que rien ne soit arrondi à l'enregistrement.</p>`,
  sources: [SRC.faq, SRC.dds, SRC.geo, SRC.val, SRC.tool], related: ['self-intersecting-polygon', 'unclosed-polygon', 'coordinate-system-wgs84'] },

{ slug: 'unclosed-polygon', alt: '/learn/eudr/unclosed-polygon/', h1: 'Polygone non fermé : le premier et le dernier point doivent être identiques', crumbName: 'Polygone non fermé', short: 'Contours ouverts et polygones avec trop peu de sommets.',
  title: 'RDUE GeoJSON : erreur de polygone « ouvert » et comment fermer le contour',
  description: 'Chaque polygone de parcelle RDUE doit être fermé : la première et la dernière paire de coordonnées doivent être identiques, avec au moins quatre positions. Pourquoi les polygones restent ouverts et comment les fermer.',
  lede: 'Un polygone de fichier de parcelles RDUE doit être une forme fermée : sa dernière paire de coordonnées doit répéter la première. Les polygones « ouverts » figurent dans la liste des erreurs GeoJSON courantes de l\'UE.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} définit un Polygon comme au moins quatre paires de coordonnées représentant une surface fermée, et précise que les coordonnées du premier et du dernier point d'un polygone sont les mêmes, pour fermer la forme. Sa liste d'erreurs courantes cite les « polygones ouverts : tous les polygones doivent représenter des formes fermées (la 1re paire de coordonnées identique à la dernière) ».</p>
<p>Un triangle demande donc quatre positions (trois sommets plus le premier répété), et un champ à quatre coins en demande cinq.</p>
<h2>Pourquoi les polygones restent ouverts</h2>
<ul>
<li><b>Contours relevés à pied.</b> L'agent fait le tour de la parcelle avec une application GPS et s'arrête à quelques mètres du point de départ. L'application enregistre les sommets tels quels.</li>
<li><b>Conversion depuis un tableur.</b> Une ligne par sommet, convertie en GeoJSON par un script qui n'ajoute pas le point de fermeture.</li>
<li><b>Lignes au lieu de polygones.</b> Certaines applications enregistrent le tour de la parcelle comme une LineString. C'est une autre erreur : voir ${L('linestring-not-accepted', 'LineString refusée')}.</li>
</ul>
<h2>Comment corriger</h2>
<p>Fermer un contour est sans risque quand la parcelle est par ailleurs correcte : copiez la première paire de coordonnées à la fin du contour. Dans QGIS, l'outil « Réparer les géométries » ou un simple nouvel enregistrement en GeoJSON ferme les contours. Si vous modifiez le fichier à la main, la paire de fermeture doit être strictement identique à la première, à la décimale près.</p>
<p>Avant de fermer, regardez l'écart. Si le dernier point est loin du premier, la fermeture trace une ligne droite à travers le champ, ce qui peut couper une partie de la parcelle ou croiser un autre côté et créer une ${L('self-intersecting-polygon', 'auto-intersection')}. Un grand écart signifie souvent que le contour n'a pas été terminé et doit être relevé à nouveau.</p>
<h2>Trop peu de sommets</h2>
<p>Un contour de moins de trois sommets distincts ne peut pas délimiter une surface ; des sommets tous alignés non plus. La page de l'UE cite les « formes représentant des lignes droites » parmi les erreurs courantes. Elles ne se corrigent pas en modifiant le fichier : il faut relever la parcelle à nouveau, ou la déclarer comme un point si elle fait 4 hectares ou moins (voir ${L('point-area-over-4-hectares', 'les points et la règle des 4 ha')}).</p>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>Contour non fermé : erreur, fermé automatiquement dans le fichier corrigé.</li>
<li>Moins de 3 sommets distincts, ou forme plate : erreur, non corrigeable automatiquement.</li>
<li>Une LineString fermée est transformée en Polygon et marquée « à vérifier », car le vérificateur ne peut pas savoir si la ligne représentait un contour.</li>
</ul>
<p>Après la fermeture, le vérificateur relance les contrôles de forme : un contour qui se croise une fois fermé est donc toujours signalé.</p>`,
  sources: [SRC.geo, SRC.tool], related: ['self-intersecting-polygon', 'linestring-not-accepted', 'polygon-holes'] },

{ slug: 'self-intersecting-polygon', alt: '/learn/eudr/self-intersecting-polygon/', h1: 'Polygone auto-sécant : lignes qui se croisent, formes en huit et pointes', crumbName: 'Polygone auto-sécant', short: 'Formes en huit, côtés qui se chevauchent et pointes sont refusés.',
  title: 'RDUE : erreur de polygone auto-sécant (forme en huit, lignes croisées, pointes)',
  description: 'Le Système d\'information de l\'UE refuse les polygones de parcelle dont les côtés se croisent (forme en huit), se replient sur eux-mêmes ou forment des pointes. Pourquoi, pourquoi ne pas corriger automatiquement, et comment relever à nouveau.',
  lede: 'Un polygone de parcelle dont le contour se croise lui-même, comme un huit, n\'est pas accepté par le Système d\'information de l\'UE. Pas plus que les formes dont les côtés se chevauchent ou se replient en pointe.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} indique que les formes avec des lignes qui se croisent (comme un huit) ne sont pas prises en charge et ne seront pas traitées. Sa liste d'erreurs courantes commence par les « lignes de coordonnées qui se croisent (formes en huit ou côtés de polygone qui se coupent) » et les « côtés qui se chevauchent : chevauchement interne ou trous lorsqu'une partie du polygone se replie vers l'intérieur ». Les ${VAL} ajoutent, plus généralement, que les données de géolocalisation ne peuvent pas contenir de géométrie invalide, comme des polygones invalides.</p>
<h2>D'où viennent ces formes</h2>
<ul>
<li><b>Sommets dans le désordre.</b> Des points relevés dans le sens des aiguilles d'une montre pour une moitié du champ et dans l'autre sens pour le reste, ou triés par numéro au lieu de l'ordre de passage, font se croiser les côtés.</li>
<li><b>Instabilité du GPS.</b> Rester immobile pendant que le GPS enregistre plusieurs points peut créer une petite boucle ou une pointe aller-retour.</li>
<li><b>Fermeture d'un contour inachevé.</b> Une ligne de fermeture droite à travers une parcelle à moitié relevée peut couper un autre côté.</li>
<li><b>Troncature.</b> Plus rarement, couper les coordonnées à 6 décimales fait se rejoindre deux sommets proches : voir ${L('six-decimal-places', 'les décimales')}.</li>
</ul>
<h2>Pourquoi ne pas corriger automatiquement</h2>
<p>Un logiciel peut « réparer » un polygone qui se croise, par exemple en le coupant en deux ou en le reconstruisant selon son contour extérieur. Mais chaque réparation est une supposition sur la vraie limite, et le résultat peut inclure des terres hors de l'exploitation ou en exclure qui en font partie. Pour une déclaration sur la déforestation, une limite plausible mais fausse est pire qu'un message d'erreur. La correction sûre : rétablir l'ordre des points d'après les notes de terrain, ou relever la parcelle à nouveau.</p>
<h2>Comment trouver et corriger</h2>
<ol>
<li>Ouvrez le fichier dans QGIS et lancez « Vérifier la validité » (Vecteur, Outils de géométrie). L'outil indique l'emplacement de chaque auto-intersection.</li>
<li>Zoomez sur cet endroit. Si deux sommets sont simplement inversés, remettez-les dans l'ordre ; si une pointe vient de l'instabilité du GPS à un coin, supprimez les points en trop.</li>
<li>Si vous ne savez pas où passe la limite, marquez la parcelle pour un nouveau relevé.</li>
<li>Relancez le contrôle avant l'export.</li>
</ol>
<h2>Ce que fait le vérificateur</h2>
<p>Les auto-intersections, pincements en huit et pointes sont signalés comme des erreurs et ne sont <b>jamais corrigés</b> par le vérificateur ; la parcelle est signalée pour un nouveau relevé. Un contour qui se croise n'est jamais réorienté ni reconstruit. Vous pouvez télécharger le fichier corrigé sans les parcelles encore en erreur, pour que les parcelles propres ne soient pas bloquées pendant que les autres sont relevées à nouveau.</p>`,
  sources: [SRC.geo, SRC.val, SRC.tool], related: ['unclosed-polygon', 'polygon-holes', 'six-decimal-places'] },

{ slug: 'polygon-holes', alt: '/learn/eudr/polygon-holes/', h1: 'Polygones avec trous refusés : la solution des deux moitiés', crumbName: 'Polygones avec trous', short: 'Une forme en anneau doit être découpée en deux polygones.',
  title: 'RDUE : erreur de polygone avec trou (forme en anneau) et solution officielle',
  description: 'Le Système d\'information de l\'UE n\'accepte pas les polygones avec trous (formes en anneau). Pourquoi des parcelles ont des trous et la solution officielle : décrire la parcelle par deux demi-anneaux.',
  lede: 'Un polygone GeoJSON peut décrire un trou, par exemple une exploitation qui entoure une habitation ou une zone protégée. Le Système d\'information de l\'UE n\'accepte pas les polygones avec trous.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} précise que les polygones avec trous (formes en anneau, « doughnut ») ne sont pas pris en charge et ne seront pas traités, et que si une forme en anneau est nécessaire, elle peut être définie en combinant deux polygones en forme de demi-anneau. Sa liste d'erreurs courantes cite les formes avec trous, avec la solution « deux formes en demi-lune », puis à nouveau les « polygones avec trous à l'intérieur », pour lesquels l'utilisateur reçoit un message d'erreur.</p>
<h2>À quoi ressemble un trou en GeoJSON</h2>
<p>Un Polygon GeoJSON est une liste de contours. Le premier est la limite extérieure ; les suivants sont des trous. Voici donc un polygone avec un trou :</p>
<pre>{"type":"Polygon","coordinates":[
  [[-4.010,5.300],[-4.000,5.300],[-4.000,5.310],[-4.010,5.310],[-4.010,5.300]],
  [[-4.006,5.304],[-4.004,5.304],[-4.004,5.306],[-4.006,5.306],[-4.006,5.304]]
]}</pre>
<p>(Affiché avec 3 décimales pour la lisibilité ; un vrai fichier en demande au moins 6.) Beaucoup d'outils SIG créent des trous automatiquement quand on soustrait une zone d'une autre, par exemple un village ou une rivière retirés d'un champ.</p>
<h2>Comment corriger</h2>
<p><b>Option 1 : deux moitiés.</b> Coupez la forme selon une ligne qui traverse le trou, pour obtenir deux polygones sans trou, et placez-les dans un MultiPolygon (ou deux entités avec les mêmes informations de producteur). Ensemble, ils couvrent la même surface que l'anneau. Dans QGIS, l'outil « Séparer les entités » sur une couche en édition le fait : tracez la ligne de coupe à travers toute la forme, en passant par le trou.</p>
<p><b>Option 2 : le trou compte-t-il ?</b> Si la zone exclue est minuscule, ou a été retirée par commodité, demandez au responsable de la déclaration si la parcelle doit simplement être décrite par sa limite extérieure. C'est un choix de fond sur les terres déclarées, pas une question de format : ne le faites pas sans le dire.</p>
<h2>Ce que fait le vérificateur</h2>
<p>Un polygone avec trous est signalé comme une <b>erreur</b> et n'est pas modifié. Couper la forme demande de décider où couper, et supprimer le trou change la surface déclarée : ni l'un ni l'autre n'est fait automatiquement.</p>
<h2>Contrôles après la découpe</h2>
<ul>
<li>Chaque moitié doit être un polygone valide et fermé : voir ${L('unclosed-polygon', 'polygone non fermé')}.</li>
<li>Les deux moitiés partagent un côté. Le vérificateur signale les parcelles qui se chevauchent par des avertissements ; se toucher le long d'un côté est normal pour une parcelle découpée, mais un vrai chevauchement doit être examiné.</li>
<li>Si vous indiquez une propriété Area, elle doit correspondre au total des deux moitiés.</li>
</ul>`,
  sources: [SRC.geo, SRC.tool], related: ['self-intersecting-polygon', 'unclosed-polygon', 'geometrycollection'] },

{ slug: 'point-area-over-4-hectares', alt: '/learn/eudr/point-area-over-4-hectares/', h1: 'Points et règle des 4 hectares : quand une parcelle exige un polygone', crumbName: 'Points et règle des 4 ha', short: 'Un point avec Area supérieure à 4 ha est une erreur (sauf bovins).',
  title: 'RDUE : point ou polygone ? La règle des 4 hectares et la propriété Area',
  description: 'Dans la géolocalisation RDUE, un point peut représenter une parcelle de 4 hectares au plus ; au-delà, il faut un polygone, sauf pour les bovins. Comment le système lit la propriété Area, sa valeur par défaut de 4 ha et son minimum.',
  lede: 'Une parcelle ne peut être décrite par un simple point que si elle fait 4 hectares ou moins. Au-delà, le Système d\'information de l\'UE attend un polygone, sauf pour les bovins.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<ul>
<li>La <a href="${SRC.faq.url}" rel="noopener" hreflang="en">FAQ</a> et la référence de l'API DDR : des polygones sont exigés pour les parcelles de plus de 4 hectares, sauf pour les bovins, pour lesquels les coordonnées ponctuelles de l'établissement suffisent.</li>
<li>Les ${VAL} : lorsqu'un point est fourni, la surface est obligatoire. Sans valeur, le système inscrit <b>4 (ha) par défaut</b>. Si la marchandise n'est pas bovine et que la valeur est <b>supérieure à 4 ha, le système renvoie une erreur</b>. Lorsqu'elle est fournie, la surface doit être d'<b>au moins 0,0001 ha</b>.</li>
<li>La page ${GEO} : la propriété facultative <code>Area</code> est la surface en hectares d'une géométrie Point ; sans elle, la surface est fixée à 4 ha. Elle avertit aussi que <code>"Area": "3"</code> (un nombre entre guillemets) est lu comme <b>0</b>, car une valeur entre guillemets n'est pas reconnue comme un nombre.</li>
</ul>
<h2>Ce que cela signifie pour un fichier de parcelles</h2>
<ul>
<li>Une cacaoyère de 2,5 ha peut être un Point avec <code>"Area": 2.5</code>.</li>
<li>Une caféière de 7 ha exige un Polygon (ou MultiPolygon). Un Point avec <code>"Area": 7</code> est une erreur.</li>
<li>Un point sans Area est compté comme 4 ha. Il passe, mais la surface déclarée peut être fausse.</li>
<li><code>"Area": 0</code>, ou <code>"Area": "2.5"</code> (texte, lu comme 0), est sous le minimum de 0,0001 ha.</li>
</ul>
<p>La page de l'UE conseille aussi d'utiliser des points pour les parcelles de moins de 4 hectares, plutôt que des polygones, afin de limiter la taille du fichier : voir ${L('file-size-limit', 'limite de taille')}.</p>
<h2>Comment corriger</h2>
<ol>
<li>Pour tout point dont Area dépasse 4, relevez la limite de la parcelle et remplacez le point par un polygone.</li>
<li>Écrivez Area comme un nombre, sans guillemets et avec un point décimal : <code>"Area": 2.5</code>.</li>
<li>Utilisez des hectares, pas des mètres carrés ni des acres. 25 000 m² font 2,5 ha ; une Area de 25000 serait lue comme 25 000 ha.</li>
<li>Si un point n'a pas de surface mesurée, envisagez d'en relever une plutôt que de compter sur la valeur par défaut de 4 ha.</li>
</ol>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>Point avec Area supérieure à 4 ha : erreur (le message rappelle l'exception des bovins).</li>
<li>Point sans Area : information, qui rappelle la valeur par défaut de 4 ha.</li>
<li>Point avec Area inférieure à 0,0001 ha, y compris 0 : erreur.</li>
<li>Area écrite en texte : avertissement, convertie en nombre dans le fichier corrigé.</li>
<li>Pour les polygones, une Area qui s'écarte de la surface calculée de plus de 25 % et de plus de 0,5 ha : avertissement. Les polygones de moins de 100 m² ou de plus de 5 000 ha sont aussi signalés pour un second regard.</li>
</ul>`,
  sources: [SRC.faq, SRC.dds, SRC.val, SRC.geo, SRC.tool], related: ['property-names', 'file-size-limit', 'geometrycollection'] },

{ slug: 'linestring-not-accepted', alt: '/learn/eudr/linestring-not-accepted/', h1: 'LineString et MultiLineString ne sont pas acceptées pour les parcelles', crumbName: 'LineString refusée', short: 'Une ligne ne décrit pas un lieu de production.',
  title: 'RDUE GeoJSON : erreur LineString, les lignes ne sont pas des parcelles valides',
  description: 'Le Système d\'information de l\'UE n\'accepte pas les géométries LineString ou MultiLineString comme lieux de production. Pourquoi les applications GPS exportent des lignes et comment transformer un contour relevé en polygone valide.',
  lede: 'Une LineString est un trajet, pas une surface. Le Système d\'information de l\'UE n\'accepte pas les géométries LineString ou MultiLineString comme lieux de production.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} liste les types de géométrie utilisés pour les lieux de production (Point, MultiPoint, Polygon, MultiPolygon et leurs collections), puis précise que les types « LineString » et « MultiLineString » ne représentent pas des formes valides pour déclarer des lieux de production et ne seront ni acceptés ni traités. Sa liste d'erreurs courantes le répète : « types de géométrie invalides (LineString) ». La référence de l'API DDR liste les types acceptés : Point, MultiPoint, Polygon, MultiPolygon et GeometryCollection.</p>
<h2>Pourquoi les fichiers contiennent des lignes</h2>
<ul>
<li><b>Enregistrement de traces.</b> Beaucoup d'applications GPS et de terrain enregistrent une marche comme une trace (une ligne). Faire le tour d'un champ produit une ligne qui suit la limite, mais cela reste une ligne.</li>
<li><b>Exports KML.</b> Les fichiers KML d'outils de cartographie stockent souvent les limites comme des LineString ou des chemins.</li>
<li><b>Routes et cours d'eau.</b> Un fichier peut contenir des lignes qui n'ont jamais été des parcelles : pistes, ruisseaux, lisière de forêt tracée pour repère.</li>
</ul>
<h2>Comment corriger</h2>
<p><b>Si la ligne est un contour relevé</b> et que sa fin revient à son début, elle peut devenir un polygone : reprenez les mêmes coordonnées comme contour extérieur et vérifiez que le dernier point est égal au premier. Dans QGIS, « Lignes vers polygones » (Vecteur, Outils de géométrie) le fait pour toute une couche. Contrôlez ensuite chaque résultat sur une carte.</p>
<p><b>Si la ligne ne se referme pas</b>, le tour de la parcelle est incomplet. La fermer par une ligne droite peut traverser le champ ou couper un autre côté : relevez à nouveau. Voir ${L('unclosed-polygon', 'polygone non fermé')}.</p>
<p><b>Si la ligne est une route ou une rivière</b>, supprimez-la du fichier d'envoi. Les éléments de repère ont leur place dans votre propre projet SIG, pas dans la géolocalisation de la déclaration.</p>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>LineString ou MultiLineString : erreur.</li>
<li>Une ligne fermée (dernier point identique au premier, avec au moins quatre points) est transformée en Polygon dans le fichier corrigé et marquée « à vérifier », car le vérificateur ne peut pas savoir si elle représentait une limite.</li>
<li>Une GeometryCollection qui contient une ligne est une erreur : voir ${L('geometrycollection', 'GeometryCollection')}.</li>
<li>Les Placemarks KML contenant des LineString sont lus et signalés de la même façon.</li>
</ul>
<h2>Pour la prochaine campagne</h2>
<p>Réglez votre application de terrain pour enregistrer les parcelles comme des polygones (ou « zones ») plutôt que comme des traces, si elle le permet. Si elle n'enregistre que des traces, ajoutez une étape de conversion et de contrôle avant que les données n'arrivent chez l'exportateur.</p>`,
  sources: [SRC.geo, SRC.dds, SRC.tool], related: ['unclosed-polygon', 'geometrycollection', 'self-intersecting-polygon'] },

{ slug: 'geometrycollection', alt: '/learn/eudr/geometrycollection/', h1: 'GeometryCollection dans les fichiers RDUE : acceptée, mais vérifiez son contenu', crumbName: 'GeometryCollection', short: 'Les collections mixtes ou contenant des lignes posent problème.',
  title: 'RDUE GeoJSON : GeometryCollection, quand elle passe et quand elle échoue',
  description: 'Le Système d\'information de l\'UE accepte la GeometryCollection, mais une collection qui contient des lignes, ou qui mélange points et polygones, crée des erreurs. Comment la remplacer par un MultiPolygon ou un MultiPoint.',
  lede: 'Une GeometryCollection regroupe plusieurs géométries dans une même entité. Le Système d\'information de l\'UE l\'accepte, mais son contenu doit respecter toutes les autres règles, et les collections mixtes sont une source fréquente de problèmes.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} définit la GeometryCollection comme « deux géométries ou plus » et précise que tout type de géométrie autre que GeometryCollection doit avoir un membre <code>coordinates</code> (une collection contient à la place une liste de géométries). La référence de l'API DDR cite GeometryCollection parmi les types acceptés, avec Point, MultiPoint, Polygon et MultiPolygon. LineString et MultiLineString ne sont acceptées nulle part, y compris dans une collection.</p>
<h2>D'où viennent les GeometryCollection</h2>
<ul>
<li>Les Placemarks KML à plusieurs géométries (MultiGeometry, par exemple une limite de parcelle plus un point central). Le vérificateur de Quickwell, par exemple, lit un tel Placemark comme une GeometryCollection.</li>
<li>Les opérations SIG de « fusion » ou de « collecte » sur des couches mixtes.</li>
<li>Les outils qui stockent ensemble un polygone et son point d'étiquette.</li>
</ul>
<h2>Les problèmes à repérer</h2>
<ul>
<li><b>Une ligne dans la collection</b> : une LineString n'est pas valide pour un lieu de production. C'est une erreur.</li>
<li><b>Points mélangés à des polygones</b> : une parcelle décrite à la fois par sa limite et par un point. Laquelle est la parcelle ? Un point à l'intérieur du polygone de la même parcelle n'apporte rien, et un point sans Area compte pour 4 ha.</li>
<li><b>Membres invalides</b> : chaque polygone de la collection doit lui-même être fermé, sans trou et sans auto-intersection.</li>
</ul>
<h2>L'alternative plus propre</h2>
<p>Si tous les membres sont du même type, utilisez le type multiple correspondant :</p>
<ul>
<li>plusieurs polygones pour la ou les parcelles d'un producteur : <b>MultiPolygon</b> ;</li>
<li>plusieurs points : <b>MultiPoint</b>.</li>
</ul>
<p>Ou donnez à chaque parcelle sa propre entité (Feature) dans la FeatureCollection, avec ses propres propriétés. Des entités séparées sont plus faciles à contrôler, et chacune peut porter son nom ProductionPlace et sa surface Area.</p>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>Collection composée uniquement de polygones, ou uniquement de points : information. Le vérificateur la fusionne en MultiPolygon ou MultiPoint dans le fichier corrigé.</li>
<li>Collection mélangeant points et polygones : avertissement, à vous de décider quelle géométrie décrit la parcelle.</li>
<li>Collection contenant une ligne : erreur.</li>
<li>Les polygones membres sont contrôlés comme tout polygone : fermeture, décimales, trous, auto-intersection.</li>
</ul>
<h2>Avant l'envoi</h2>
<p>Ouvrez le fichier sur une carte et cliquez sur quelques entités de type collection. Si vous voyez une limite avec un point au milieu, ou un trajet le long d'une route, nettoyez l'entité pour ne garder que la géométrie de la parcelle. Contrôlez ensuite le fichier à nouveau : une collection réduite à une seule géométrie s'écrit plus simplement comme cette géométrie seule.</p>`,
  sources: [SRC.geo, SRC.dds, SRC.tool], related: ['linestring-not-accepted', 'polygon-holes', 'point-area-over-4-hectares'] },

{ slug: 'property-names', alt: '/learn/eudr/property-names/', h1: 'Noms de propriétés : ProducerName, ProducerCountry, ProductionPlace, Area', crumbName: 'Noms de propriétés', short: 'Noms sensibles à la casse et codes pays à 2 lettres.',
  title: 'RDUE GeoJSON : propriétés ProducerName, ProducerCountry, ProductionPlace et Area',
  description: 'Le Système d\'information de l\'UE lit quatre propriétés GeoJSON facultatives, dont les noms sont sensibles à la casse : ProducerName, ProducerCountry (code ISO à 2 lettres), ProductionPlace et Area. Erreurs fréquentes et corrections.',
  lede: 'Le Système d\'information de l\'UE lit quatre propriétés facultatives sur chaque parcelle. Leurs noms sont sensibles à la casse et tout le reste est ignoré : « pays » ou « productionplace » ne transmettent donc rien.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<p>La page ${GEO} liste les propriétés facultatives traitées par le système :</p>
<div class="tbl"><table>
<tr><th>Propriété</th><th>Signification</th></tr>
<tr><td><code>ProducerName</code></td><td>Nom facultatif du producteur pour la géométrie</td></tr>
<tr><td><code>ProducerCountry</code></td><td>Pays de production, en code ISO à 2 lettres</td></tr>
<tr><td><code>ProductionPlace</code></td><td>Nom facultatif du lieu de production (recommandé)</td></tr>
<tr><td><code>Area</code></td><td>Surface en hectares, pour les géométries Point</td></tr>
</table></div>
<p>Toute autre propriété valide sur le plan syntaxique est ignorée. La page cite parmi les erreurs courantes les « noms de propriétés invalides (par exemple casse incorrecte : 'productionplace' au lieu de 'ProductionPlace') » et les « codes pays ISO2 invalides ». Elle rappelle aussi que <code>"Area": "3"</code> entre guillemets est lu comme 0.</p>
<h2>Fichiers de type I et de type II</h2>
<p>L'UE décrit deux variantes de même structure. Un fichier de <b>type I</b> s'utilise via l'API et au niveau du producteur dans l'interface web. Un fichier de <b>type II</b>, importé au niveau de la marchandise dans l'interface web, contient plusieurs producteurs regroupés par ProducerName et ProducerCountry, et doit comporter <b>ProducerCountry sur chaque entité</b>. Le système recommande aussi de toujours indiquer ProductionPlace.</p>
<h2>Erreurs fréquentes</h2>
<ul>
<li><b>Noms traduits ou locaux</b> : <code>pays</code>, <code>superficie</code>, <code>nom_producteur</code>, <code>country</code>.</li>
<li><b>Mauvaise casse</b> : <code>producerCountry</code>, <code>PRODUCERNAME</code>, <code>area</code>.</li>
<li><b>Noms de pays au lieu de codes</b> : <code>"Côte d'Ivoire"</code>, <code>"Ghana"</code>, ou des codes à 3 lettres comme <code>CIV</code>. La valeur doit être le code à 2 lettres, par exemple <code>CI</code>, <code>GH</code>, <code>CM</code>, <code>ET</code>, <code>BR</code>.</li>
<li><b>Codes en minuscules</b> : <code>ci</code> au lieu de <code>CI</code>.</li>
<li><b>Area en texte ou dans une autre unité</b> : voir ${L('point-area-over-4-hectares', 'la règle des 4 ha')}.</li>
</ul>
<h2>Comment corriger</h2>
<p>Renommez les colonnes de votre tableur source avec les noms exacts ci-dessus avant la conversion, ou renommez les champs dans QGIS (propriétés de la couche, Champs). Remplacez les noms de pays par les codes à 2 lettres. Ouvrez ensuite le GeoJSON dans un éditeur de texte et vérifiez une entité à l'œil.</p>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>Alias reconnus et mauvaise casse (<code>pays</code>, <code>superficie</code>, <code>producer_name</code>, <code>productionplace</code> et d'autres) : avertissement, renommés avec les noms officiels dans le fichier corrigé.</li>
<li>ProducerCountry qui n'est pas un code à 2 lettres : erreur, converti en code ISO à 2 lettres quand le pays est reconnaissable.</li>
<li>ProducerCountry absent sur certaines parcelles seulement : avertissement.</li>
<li>Parcelle située hors de son pays ProducerCountry : avertissement, qui révèle souvent des ${L('swapped-coordinates', 'coordonnées inversées')}.</li>
</ul>
<h2>Une entité minimale correcte</h2>
<pre>{"type":"Feature",
 "properties":{"ProducerName":"Coop Exemple","ProducerCountry":"CI",
               "ProductionPlace":"Parcelle 12","Area":2.5},
 "geometry":{"type":"Point","coordinates":[-4.012345,5.312345]}}</pre>
<p>Cet exemple est fictif. Notez la casse exacte de chaque nom, le code pays à 2 lettres, le nombre sans guillemets pour Area et la longitude avant la latitude. Les autres propriétés peuvent rester dans vos propres archives : le système les ignore, elles ne font qu'alourdir le fichier.</p>`,
  sources: [SRC.geo, SRC.tool], related: ['point-area-over-4-hectares', 'swapped-coordinates', 'file-size-limit'] },

{ slug: 'file-size-limit', alt: '/learn/eudr/file-size-limit/', h1: 'Limites de taille et de volume : 25 Mo par déclaration, 1 000 producteurs par marchandise', crumbName: 'Limite de taille (25 Mo)', short: 'La limite de 25 Mo et les limites de nombre de producteurs.',
  title: 'RDUE GeoJSON : limite de taille de 25 Mo et limites de producteurs',
  description: 'Le Système d\'information de l\'UE limite les données de géolocalisation à 25 Mo par déclaration, et les producteurs à 1 000 par marchandise et 10 000 par déclaration. Comment alléger un fichier de parcelles sans perdre en précision.',
  lede: 'Le Système d\'information de l\'UE plafonne les données de géolocalisation d\'une déclaration de diligence raisonnée à 25 Mo, tous fichiers GeoJSON confondus. Il limite aussi le nombre de producteurs par déclaration.',
  body: `
<h2>Ce que dit la documentation de l'UE</h2>
<ul>
<li>La page ${GEO} : le système applique une limite de 25 Mo par déclaration, qui comprend la taille totale des fichiers GeoJSON envoyés. Les fichiers qui la dépassent figurent dans sa liste d'erreurs courantes.</li>
<li>Les ${VAL} : la taille totale des données de géolocalisation par déclaration ne peut pas dépasser un certain montant (« actuellement 25 Mb »). Le nombre total de producteurs ne peut pas dépasser 1 000 par marchandise et 10 000 par déclaration.</li>
<li>Autres erreurs courantes citées pour les fichiers en général : format invalide (par exemple PDF ou texte brut), erreurs de syntaxe comme une accolade manquante, et fichiers protégés par mot de passe.</li>
</ul>
<h2>Les conseils de l'UE pour les gros fichiers</h2>
<p>La page GeoJSON recommande deux solutions, tout en rappelant que les opérateurs doivent obtenir des données de géolocalisation aussi précises que possible :</p>
<ol>
<li><b>Moins de points sur les côtés droits.</b> Deux points suffisent pour définir une ligne droite, au lieu de relever des coordonnées tous les 5 à 10 mètres le long de celle-ci.</li>
<li><b>Des points pour les petites parcelles.</b> Utiliser un seul point de géolocalisation pour les parcelles de moins de 4 hectares plutôt qu'un polygone.</li>
</ol>
<h2>Autres causes de fichiers trop lourds</h2>
<ul>
<li><b>Décimales en trop.</b> Le système ne garde que 6 décimales ; des coordonnées à 15 décimales gaspillent de la place. Voir ${L('six-decimal-places', 'les décimales')}.</li>
<li><b>Altitude et valeurs supplémentaires.</b> Un troisième nombre (l'altitude) dans chaque position. Le format de l'UE autorise plus de deux valeurs, mais seules la longitude et la latitude sont utilisées.</li>
<li><b>Mise en forme.</b> L'indentation et les retours à la ligne peuvent doubler la taille d'un fichier. Un JSON compact est tout aussi valide.</li>
<li><b>Propriétés inutiles.</b> Toute propriété hors de la liste officielle est ignorée mais compte dans la taille.</li>
<li><b>Traces GPS.</b> Un contour relevé avec un point par seconde peut compter des milliers de sommets presque identiques.</li>
</ul>
<h2>Simplifier sans risque</h2>
<p>Les outils SIG peuvent simplifier les polygones (supprimer les points qui changent à peine la forme). Utilisez une faible tolérance et vérifiez le résultat : une simplification qui déplace la limite de plusieurs mètres change les terres déclarées et peut créer des auto-intersections dans les parcelles étroites.</p>
<h2>Ce que fait le vérificateur</h2>
<ul>
<li>Fichier de plus de 25 Mo (lu comme 25 000 000 octets) : erreur. Plus de 20 Mo : avertissement.</li>
<li>Plus de 1 000 producteurs distincts (ProducerName plus ProducerCountry), ou plus de 10 000 parcelles : avertissement, pour vérifier comment le fichier sera réparti entre déclarations.</li>
<li>Le fichier corrigé est écrit de façon compacte, avec 6 décimales, sans altitude, une entité par ligne, ce qui le rend en général beaucoup plus léger.</li>
</ul>`,
  sources: [SRC.geo, SRC.val, SRC.tool], related: ['six-decimal-places', 'point-area-over-4-hectares', 'property-names'] },
];
