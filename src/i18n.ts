export const SUPPORTED_LOCALES = ['en', 'de', 'da', 'fr', 'it', 'ja', 'es'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface Translation {
  readonly documentTitle: string;
  readonly description: string;
  readonly experienceLabel: string;
  readonly languageLabel: string;
  readonly renderUnsupported: string;
  readonly renderLost: string;
  readonly title: string;
  readonly opening: readonly [string, string];
  readonly ruleIntro: string;
  readonly closing: readonly [string, string, string, string, string];
  readonly catalogLabel: string;
  readonly paletteLabel: string;
  readonly palette: string;
  readonly body: string;
  readonly pulse: string;
  readonly copyP5: string;
  readonly copiedP5: string;
  readonly openMorphospace: string;
  readonly copyFailed: string;
  readonly reset: string;
  readonly showCreature: (number: string) => string;
  readonly attributionLabel: string;
  readonly p5By: string;
  readonly wolframBy: string;
}

export const TRANSLATIONS: Readonly<Record<Locale, Translation>> = {
  en: {
    documentTitle: 'creature – a museum of equations',
    description:
      'A browser museum of mathematical creatures, animated live from Wolfram and p5.js equations.',
    experienceLabel: 'Live mathematical creature exhibition',
    languageLabel: 'Language',
    renderUnsupported: 'This artwork needs a browser with WebGL 2 support.',
    renderLost: 'The graphics context was interrupted. The scene will return automatically.',
    title: 'A creature made of equations',
    opening: [
      'This creature does not exist in any ordinary sense. It was neither drawn from nature nor constructed according to an anatomy. Its shape emerges from a small collection of mathematical relationships unfolding through time, with thousands of points following the same compact rule.',
      'As those points move together, abstraction begins to resemble anatomy. Curves appear like limbs, roots, tendrils or the exposed structure of an unknown animal. The figure seems to turn, reach and drift through the darkness, although the equations contain no body and prescribe no intention.',
    ],
    ruleIntro: 'The rule behind it is almost disconcertingly small:',
    closing: [
      'There is no creature hidden inside these expressions. They describe oscillation, distance, rotation and time. Yet their interaction produces something that appears coherent enough for the mind to treat it as a living presence.',
      'At some point, we stop following the individual dots. Their relations become more important than the points themselves, and movement becomes form. The mathematics does not name an animal. That recognition belongs entirely to the observer.',
      'Eugene Wigner once wondered why mathematics describes the natural world with such astonishing precision. Here, the question seems to approach us from the opposite direction. A few abstract functions produce a form that feels natural before it resembles anything familiar.',
      'Perhaps mathematics does more than describe finished things. Perhaps it reveals how much form can already be contained in a relation, how much apparent complexity can unfold from a simple rule, and how readily the mind turns order into life.',
      'For a moment, the creature remains suspended between equation and organism: reality seen before it becomes form.',
    ],
    catalogLabel: 'Mathematical creature catalogue',
    paletteLabel: 'Selected creature palette',
    palette: 'Palette',
    body: 'Body',
    pulse: 'Pulse',
    copyP5: 'Copy p5.js',
    copiedP5: 'Copied',
    openMorphospace: 'Open in Morphospace',
    copyFailed: 'Copy failed',
    reset: 'Reset',
    showCreature: (number) => `Show creature ${number}`,
    attributionLabel: 'Source attribution',
    p5By: 'p5.js by',
    wolframBy: 'Wolfram translation by',
  },
  de: {
    documentTitle: 'creature – ein Museum der Gleichungen',
    description:
      'Ein Browsermuseum mathematischer Kreaturen, live animiert aus Wolfram- und p5.js-Gleichungen.',
    experienceLabel: 'Live-Ausstellung mathematischer Kreaturen',
    languageLabel: 'Sprache',
    renderUnsupported: 'Dieses Kunstwerk benötigt einen Browser mit WebGL-2-Unterstützung.',
    renderLost: 'Der Grafikkontext wurde unterbrochen. Die Szene kehrt automatisch zurück.',
    title: 'Eine Kreatur aus Gleichungen',
    opening: [
      'Diese Kreatur existiert in keinem gewöhnlichen Sinn. Sie wurde weder der Natur nachgezeichnet noch nach anatomischen Vorgaben konstruiert. Ihre Gestalt entsteht aus wenigen mathematischen Beziehungen, die sich mit der Zeit entfalten, während Tausende von Punkten derselben kompakten Regel folgen.',
      'Wenn sich diese Punkte gemeinsam bewegen, beginnt die Abstraktion, an Anatomie zu erinnern. Kurven erscheinen wie Gliedmassen, Wurzeln, Ranken oder die freigelegte Struktur eines unbekannten Tieres. Die Figur scheint sich zu drehen, auszugreifen und durch die Dunkelheit zu treiben, obwohl in den Gleichungen weder ein Körper noch eine Absicht angelegt ist.',
    ],
    ruleIntro: 'Die Regel dahinter ist beinahe verstörend klein:',
    closing: [
      'In diesen Ausdrücken ist keine Kreatur verborgen. Sie beschreiben Schwingung, Distanz, Rotation und Zeit. Doch in ihrem Zusammenspiel entsteht etwas, das so geschlossen wirkt, dass wir darin etwas «Lebendiges» wahrnehmen.',
      'Irgendwann hören wir auf, den einzelnen Punkten zu folgen. Ihre Beziehungen werden wichtiger als die Punkte selbst, und Bewegung wird zu Form. Die Mathematik benennt kein Tier. Erst in unserer Wahrnehmung wird eines daraus.',
      'Eugene Wigner fragte einst, weshalb sich die Natur mit Mathematik so erstaunlich präzise beschreiben lässt. Hier begegnet uns die Frage aus der Gegenrichtung. Wenige abstrakte Funktionen bringen eine Form hervor, die natürlich wirkt, noch bevor sie etwas Vertrautem ähnelt.',
      'Vielleicht beschreibt die Mathematik nicht nur Dinge, die bereits Gestalt angenommen haben. Vielleicht zeigt sie auch, wie viel Form schon in einer Beziehung liegen kann, wie sich aus einer einfachen Regel scheinbare Komplexität entfaltet und wie mühelos unsere Wahrnehmung aus Ordnung etwas Lebendiges entstehen lässt.',
      'Für einen Moment schwebt die Kreatur zwischen Gleichung und Organismus – wie ein Stück Wirklichkeit, noch bevor es Gestalt annimmt.',
    ],
    catalogLabel: 'Katalog mathematischer Kreaturen',
    paletteLabel: 'Farbpalette der ausgewählten Kreatur',
    palette: 'Palette',
    body: 'Körper',
    pulse: 'Puls',
    copyP5: 'p5.js kopieren',
    copiedP5: 'Kopiert',
    openMorphospace: 'In Morphospace öffnen',
    copyFailed: 'Kopieren fehlgeschlagen',
    reset: 'Zurücksetzen',
    showCreature: (number) => `Kreatur ${number} zeigen`,
    attributionLabel: 'Quellenangabe',
    p5By: 'p5.js von',
    wolframBy: 'Wolfram-Übersetzung von',
  },
  da: {
    documentTitle: 'creature – et museum af ligninger',
    description:
      'Et browsermuseum med matematiske væsner, animeret direkte af Wolfram- og p5.js-ligninger.',
    experienceLabel: 'Levende udstilling af matematiske væsner',
    languageLabel: 'Sprog',
    renderUnsupported: 'Dette værk kræver en browser med understøttelse af WebGL 2.',
    renderLost: 'Grafikkonteksten blev afbrudt. Scenen vender automatisk tilbage.',
    title: 'Et væsen skabt af ligninger',
    opening: [
      'Dette væsen eksisterer ikke i nogen almindelig forstand. Det er hverken tegnet efter naturen eller konstrueret ud fra en anatomi. Dets form opstår af en lille samling matematiske relationer, der udfolder sig gennem tiden, mens tusindvis af punkter følger den samme kompakte regel.',
      'Når punkterne bevæger sig sammen, begynder abstraktionen at ligne anatomi. Kurver viser sig som lemmer, rødder, ranker eller den blottede struktur af et ukendt dyr. Figuren synes at dreje, række ud og drive gennem mørket, selv om ligningerne ikke rummer nogen krop og ikke foreskriver nogen hensigt.',
    ],
    ruleIntro: 'Reglen bag det hele er næsten foruroligende lille:',
    closing: [
      'Der gemmer sig intet væsen i disse udtryk. De beskriver svingning, afstand, rotation og tid. Alligevel skaber deres samspil en helhed, som vi spontant oplever som levende.',
      'På et tidspunkt holder vi op med at følge de enkelte prikker. Deres relationer bliver vigtigere end punkterne selv, og bevægelse bliver til form. Matematikken navngiver ikke noget dyr. Det er først i vores blik, at figuren bliver til et.',
      'Eugene Wigner undrede sig engang over, hvordan naturen kan lade sig beskrive matematisk med så forbløffende præcision. Her møder spørgsmålet os fra den modsatte retning. Nogle få abstrakte funktioner frembringer en form, der virker naturlig, længe før den ligner noget velkendt.',
      'Måske beskriver matematikken ikke blot former, der allerede findes. Måske viser den også, hvor meget form der kan ligge i en relation, hvordan tilsyneladende kompleksitet kan udfolde sig af en enkel regel, og hvor ubesværet vi får øje på liv i orden.',
      'Et øjeblik svæver væsenet mellem ligning og organisme – som et stykke virkelighed, før det får form.',
    ],
    catalogLabel: 'Katalog over matematiske væsner',
    paletteLabel: 'Farvepalette for det valgte væsen',
    palette: 'Farver',
    body: 'Krop',
    pulse: 'Puls',
    copyP5: 'Kopiér p5.js',
    copiedP5: 'Kopieret',
    openMorphospace: 'Åbn i Morphospace',
    copyFailed: 'Kunne ikke kopieres',
    reset: 'Nulstil',
    showCreature: (number) => `Vis væsen ${number}`,
    attributionLabel: 'Kildeangivelse',
    p5By: 'p5.js af',
    wolframBy: 'Wolfram-oversættelse af',
  },
  fr: {
    documentTitle: 'creature – un musée d’équations',
    description:
      'Un musée de créatures mathématiques dans le navigateur, animé en direct par des équations Wolfram et p5.js.',
    experienceLabel: 'Exposition vivante de créatures mathématiques',
    languageLabel: 'Langue',
    renderUnsupported: 'Cette œuvre nécessite un navigateur compatible avec WebGL 2.',
    renderLost: 'Le contexte graphique a été interrompu. La scène reviendra automatiquement.',
    title: 'Une créature faite d’équations',
    opening: [
      'Cette créature n’existe dans aucun sens ordinaire. Elle n’a été ni dessinée d’après nature ni construite selon une anatomie. Sa forme émerge d’un petit ensemble de relations mathématiques qui se déploient dans le temps, tandis que des milliers de points suivent la même règle compacte.',
      'Lorsque ces points se déplacent ensemble, l’abstraction commence à évoquer une anatomie. Des courbes apparaissent comme des membres, des racines, des vrilles ou la structure mise à nu d’un animal inconnu. La figure semble se tourner, se tendre et dériver dans l’obscurité, bien que les équations ne contiennent aucun corps et ne prescrivent aucune intention.',
    ],
    ruleIntro: 'La règle qui la sous-tend est d’une brièveté presque déconcertante :',
    closing: [
      'Aucune créature ne se cache dans ces expressions. Elles décrivent l’oscillation, la distance, la rotation et le temps. Pourtant, leur interaction forme un ensemble assez cohérent pour que nous y percevions quelque chose de « vivant ».',
      'À un certain moment, nous cessons de suivre les points un à un. Leurs relations deviennent plus importantes que les points eux-mêmes, et le mouvement devient forme. Les mathématiques ne nomment aucun animal. C’est notre regard qui fait de cette forme un animal.',
      'Eugene Wigner s’est un jour demandé comment la nature pouvait se laisser décrire par les mathématiques avec une précision si étonnante. Ici, la question nous arrive en sens inverse. Quelques fonctions abstraites font naître une forme qui paraît naturelle bien avant de ressembler à quoi que ce soit de familier.',
      'Peut-être les mathématiques ne décrivent-elles pas seulement des formes déjà achevées. Peut-être montrent-elles aussi tout ce qu’une relation peut contenir, toute la complexité qu’une règle simple peut déployer et la facilité avec laquelle notre perception fait surgir du vivant à partir de l’ordre.',
      'Un instant, la créature demeure suspendue entre équation et organisme – comme un fragment de réalité avant qu’il ne prenne forme.',
    ],
    catalogLabel: 'Catalogue des créatures mathématiques',
    paletteLabel: 'Palette de la créature sélectionnée',
    palette: 'Palette',
    body: 'Corps',
    pulse: 'Impulsion',
    copyP5: 'Copier p5.js',
    copiedP5: 'Copié',
    openMorphospace: 'Ouvrir dans Morphospace',
    copyFailed: 'Échec de la copie',
    reset: 'Réinitialiser',
    showCreature: (number) => `Afficher la créature ${number}`,
    attributionLabel: 'Attribution des sources',
    p5By: 'p5.js par',
    wolframBy: 'Traduction Wolfram par',
  },
  it: {
    documentTitle: 'creature – un museo di equazioni',
    description:
      'Un museo nel browser di creature matematiche, animate dal vivo con equazioni Wolfram e p5.js.',
    experienceLabel: 'Esposizione dal vivo di creature matematiche',
    languageLabel: 'Lingua',
    renderUnsupported: 'Quest’opera richiede un browser con supporto WebGL 2.',
    renderLost: 'Il contesto grafico si è interrotto. La scena tornerà automaticamente.',
    title: 'Una creatura fatta di equazioni',
    opening: [
      'Questa creatura non esiste in alcun senso ordinario. Non è stata né disegnata dal vero né costruita secondo un’anatomia. La sua forma emerge da un piccolo insieme di relazioni matematiche che si dispiegano nel tempo, mentre migliaia di punti seguono la stessa regola compatta.',
      'Quando quei punti si muovono insieme, l’astrazione comincia a ricordare un’anatomia. Le curve appaiono come arti, radici, viticci o la struttura esposta di un animale sconosciuto. La figura sembra voltarsi, protendersi e fluttuare nell’oscurità, benché le equazioni non contengano alcun corpo e non prescrivano alcuna intenzione.',
    ],
    ruleIntro: 'La regola che la genera è quasi sconcertante nella sua brevità:',
    closing: [
      'In queste espressioni non è nascosta alcuna creatura. Descrivono oscillazione, distanza, rotazione e tempo. Eppure, dal loro intreccio nasce qualcosa di tanto coerente da farci percepire una presenza «vivente».',
      'A un certo punto smettiamo di seguire i singoli punti. Le loro relazioni diventano più importanti dei punti stessi, e il movimento diventa forma. La matematica non dà un nome a un animale. È lo sguardo di chi osserva a trasformare quella forma in un animale.',
      'Eugene Wigner si chiese una volta come fosse possibile descrivere la natura con una precisione matematica tanto sorprendente. Qui la domanda ci viene incontro dalla direzione opposta. Poche funzioni astratte generano una forma che appare naturale molto prima di assomigliare a qualcosa di familiare.',
      'Forse la matematica non descrive soltanto forme già compiute. Forse mostra anche quanta forma possa essere racchiusa in una relazione, quanta complessità possa nascere da una regola semplice e con quanta facilità la nostra percezione trasformi l’ordine in qualcosa di vivo.',
      'Per un istante, la creatura rimane sospesa tra equazione e organismo – come un frammento di realtà prima che prenda forma.',
    ],
    catalogLabel: 'Catalogo delle creature matematiche',
    paletteLabel: 'Tavolozza della creatura selezionata',
    palette: 'Tavolozza',
    body: 'Corpo',
    pulse: 'Impulso',
    copyP5: 'Copia p5.js',
    copiedP5: 'Copiato',
    openMorphospace: 'Apri in Morphospace',
    copyFailed: 'Copia non riuscita',
    reset: 'Ripristina',
    showCreature: (number) => `Mostra la creatura ${number}`,
    attributionLabel: 'Attribuzione delle fonti',
    p5By: 'p5.js di',
    wolframBy: 'Traduzione Wolfram di',
  },
  ja: {
    documentTitle: 'creature – 方程式の博物館',
    description: 'Wolframとp5.jsの方程式から生まれた数学的な生き物を、ブラウザでライブ展示する博物館。',
    experienceLabel: '数学的な生き物のライブ展示',
    languageLabel: '言語',
    renderUnsupported: 'この作品の表示には、WebGL 2に対応したブラウザが必要です。',
    renderLost: 'グラフィックスの接続が中断されました。シーンは自動的に復帰します。',
    title: '方程式から生まれた生き物',
    opening: [
      'この生き物は、通常の意味では存在しない。自然を写し取ったものでも、解剖学に基づいて組み立てられたものでもない。その姿は、時間の中で展開する少数の数学的な関係から生まれ、何千もの点が同じ簡潔な規則に従っている。',
      '点が一緒に動き始めると、抽象はしだいに解剖学のように見えてくる。曲線は、手足や根、巻きひげ、あるいは未知の動物の剥き出しの構造のように現れる。方程式には身体も意図も含まれていないのに、その姿は向きを変え、手を伸ばし、暗闇を漂っているように見える。',
    ],
    ruleIntro: 'その背後にある規則は、驚くほど小さい：',
    closing: [
      'これらの式の中に、生き物が隠れているわけではない。式が記述するのは、振動、距離、回転、そして時間である。それでも式が重なり合うと一つのまとまりが生まれ、私たちはそこに生き物の気配を感じる。',
      'ある瞬間から、私たちは一つ一つの点を追わなくなる。点そのものより関係の方が重要になり、動きが形になる。数学は動物の名を示さない。それが動物に見えるかどうかは、見る側の知覚に委ねられている。',
      'ユージン・ウィグナーはかつて、なぜ数学が自然界をこれほど驚くべき精度で記述できるのかと問うた。ここでは、その問いが反対側から近づいてくるように思える。わずかな抽象関数が、見慣れた何かに似るより先に、自然だと感じられる形を生み出す。',
      '数学は、すでに形を得たものを記述するだけではないのかもしれない。一つの関係にどれほど多くの形が潜み、単純な規則からどれほどの複雑さが広がり、私たちが秩序の中にどれほど自然に生命を見いだすかを示しているのかもしれない。',
      'ひととき、その生き物は方程式と生命体のあいだに浮かぶ。まだ形を得る前の現実のように。',
    ],
    catalogLabel: '数学的な生き物のカタログ',
    paletteLabel: '選択した生き物の配色',
    palette: '配色',
    body: '本体',
    pulse: 'パルス',
    copyP5: 'p5.jsをコピー',
    copiedP5: 'コピー済み',
    openMorphospace: 'Morphospaceで開く',
    copyFailed: 'コピーできませんでした',
    reset: 'リセット',
    showCreature: (number) => `生き物${number}を表示`,
    attributionLabel: '出典',
    p5By: 'p5.js制作',
    wolframBy: 'Wolfram翻訳',
  },
  es: {
    documentTitle: 'creature – un museo de ecuaciones',
    description:
      'Un museo en el navegador de criaturas matemáticas, animadas en directo mediante ecuaciones de Wolfram y p5.js.',
    experienceLabel: 'Exposición en vivo de criaturas matemáticas',
    languageLabel: 'Idioma',
    renderUnsupported: 'Esta obra necesita un navegador compatible con WebGL 2.',
    renderLost: 'El contexto gráfico se ha interrumpido. La escena volverá automáticamente.',
    title: 'Una criatura hecha de ecuaciones',
    opening: [
      'Esta criatura no existe en ningún sentido ordinario. No fue dibujada a partir de la naturaleza ni construida según una anatomía. Su forma emerge de un pequeño conjunto de relaciones matemáticas que se despliegan en el tiempo, mientras miles de puntos siguen la misma regla compacta.',
      'Cuando esos puntos se mueven juntos, la abstracción empieza a parecer anatomía. Las curvas surgen como extremidades, raíces, zarcillos o la estructura expuesta de un animal desconocido. La figura parece girar, extenderse y flotar en la oscuridad, aunque las ecuaciones no contienen ningún cuerpo ni prescriben intención alguna.',
    ],
    ruleIntro: 'La regla que hay detrás es casi desconcertantemente pequeña:',
    closing: [
      'No hay ninguna criatura escondida en estas expresiones. Describen oscilación, distancia, rotación y tiempo. Sin embargo, de su interacción surge algo tan coherente que acabamos percibiéndolo como una presencia viva.',
      'En algún momento dejamos de seguir los puntos individuales. Sus relaciones se vuelven más importantes que los propios puntos, y el movimiento se convierte en forma. Las matemáticas no nombran ningún animal. Es la mirada de quien observa la que convierte esa forma en un animal.',
      'Eugene Wigner se preguntó una vez cómo era posible describir la naturaleza con una precisión matemática tan asombrosa. Aquí la pregunta se acerca desde la dirección opuesta. Unas pocas funciones abstractas producen una forma que resulta natural mucho antes de parecerse a algo conocido.',
      'Quizá las matemáticas no se limiten a describir formas ya acabadas. Quizá también muestren cuánta forma puede contener una relación, cuánta complejidad puede desplegar una regla sencilla y con qué facilidad nuestra percepción hace surgir vida del orden.',
      'Por un instante, la criatura permanece suspendida entre ecuación y organismo, como un fragmento de realidad antes de adquirir forma.',
    ],
    catalogLabel: 'Catálogo de criaturas matemáticas',
    paletteLabel: 'Paleta de la criatura seleccionada',
    palette: 'Paleta',
    body: 'Cuerpo',
    pulse: 'Pulso',
    copyP5: 'Copiar p5.js',
    copiedP5: 'Copiado',
    openMorphospace: 'Abrir en Morphospace',
    copyFailed: 'No se pudo copiar',
    reset: 'Restablecer',
    showCreature: (number) => `Mostrar criatura ${number}`,
    attributionLabel: 'Atribución de fuentes',
    p5By: 'p5.js de',
    wolframBy: 'Traducción Wolfram de',
  },
};

export function resolveLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.trim().toLowerCase().split('-')[0];
    if (SUPPORTED_LOCALES.includes(base as Locale)) return base as Locale;
  }

  return 'en';
}
