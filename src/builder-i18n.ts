import { resolveLocale, type Locale } from './i18n';
import type { MorphKey } from './builder-model';

export const BUILDER_LOCALES = ['en', 'de', 'da', 'fr', 'it', 'ja', 'es'] as const;

export type BuilderLocale = (typeof BUILDER_LOCALES)[number];
export type EvolutionMode = 'close' | 'bold' | 'strange';
export type CodeTab = 'wolfram' | 'p5js' | 'webgl';

export interface BuilderControlTranslation {
  readonly label: string;
  readonly description: string;
}

export interface BuilderTranslation {
  readonly documentTitle: string;
  readonly description: string;
  readonly languageLabel: string;
  readonly brandMode: 'MORPHOSPACE';
  readonly backToMuseum: string;
  readonly stageLabel: string;
  readonly specimen: {
    readonly unnamed: string;
    readonly genome: (id: string) => string;
    readonly points: (count: string) => string;
  };
  readonly intro: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
  };
  readonly actions: {
    readonly label: string;
    readonly generate: string;
    readonly mutate: string;
    readonly undo: string;
    readonly reset: string;
  };
  readonly evolution: {
    readonly title: string;
    readonly description: string;
    readonly ariaLabel: string;
    readonly modes: Readonly<Record<EvolutionMode, string>>;
  };
  readonly formField: {
    readonly title: string;
    readonly description: string;
    readonly ariaLabel: string;
    readonly ordered: string;
    readonly wild: string;
    readonly compact: string;
    readonly expansive: string;
    readonly changed: string;
  };
  readonly development: {
    readonly title: string;
    readonly description: string;
    readonly ariaLabel: string;
    readonly transformations: readonly [string, string, string, string, string, string];
  };
  readonly fineTuning: {
    readonly title: string;
    readonly geneCount: (count: number) => string;
  };
  readonly groups: {
    readonly form: { readonly title: string; readonly description: string };
    readonly structure: { readonly title: string; readonly description: string };
    readonly life: { readonly title: string; readonly description: string };
  };
  readonly controls: Readonly<Record<MorphKey, BuilderControlTranslation>>;
  readonly colour: {
    readonly title: string;
    readonly description: string;
    readonly body: string;
    readonly pulse: string;
  };
  readonly screensaver: {
    readonly title: string;
    readonly description: string;
    readonly preview: string;
    readonly download: string;
    readonly exported: string;
    readonly previewUnavailable: string;
  };
  readonly code: {
    readonly title: string;
    readonly description: string;
    readonly tabLabel: string;
    readonly tabs: Readonly<Record<CodeTab, string>>;
    readonly tabDescriptions: Readonly<Record<CodeTab, string>>;
    readonly copy: string;
    readonly copied: string;
    readonly copyFailed: string;
    readonly edit: string;
    readonly editorLabel: string;
    readonly apply: string;
    readonly applying: string;
    readonly pending: string;
    readonly discard: string;
    readonly reset: string;
    readonly applied: string;
    readonly synchronised: string;
    readonly invalid: string;
    readonly compileFailed: (message: string) => string;
  };
  readonly status: {
    readonly saving: string;
    readonly savedLocally: string;
    readonly storageUnavailable: string;
    readonly generated: string;
    readonly mutated: string;
    readonly tuningReset: string;
    readonly renderUnsupported: string;
    readonly renderLost: string;
    readonly noCoherentForm: string;
    readonly generationFailed: string;
  };
  readonly attribution: {
    readonly label: string;
    readonly p5By: string;
    readonly wolframBy: string;
    readonly projectBy: string;
  };
}

export const BUILDER_TRANSLATIONS: Readonly<Record<BuilderLocale, BuilderTranslation>> = {
  en: {
    documentTitle: 'MORPHOSPACE – build a mathematical creature',
    description: 'Generate, evolve and edit a living mathematical form in the browser.',
    languageLabel: 'Language',
    brandMode: 'MORPHOSPACE',
    backToMuseum: 'Back to the creature museum',
    stageLabel: 'Live creature preview',
    specimen: {
      unnamed: 'Unnamed organism',
      genome: (id) => `genome ${id}`,
      points: (count) => `${count} points`,
    },
    intro: {
      kicker: 'Equation laboratory',
      title: 'Generate a creature',
      body: 'Generate a new equation program, then tune the form that emerges. Seven mathematical topologies keep the search coherent without drawing an anatomy.',
    },
    actions: {
      label: 'Builder actions',
      generate: 'Generate new',
      mutate: 'Mutate',
      undo: 'Undo',
      reset: 'Reset',
    },
    evolution: {
      title: 'Evolution',
      description: 'distance from this specimen',
      ariaLabel: 'Mutation distance',
      modes: { close: 'Close', bold: 'Bold', strange: 'Strange' },
    },
    formField: {
      title: 'Form field',
      description: 'shape several genes at once',
      ariaLabel: 'Form field: use left and right for span, up and down for complexity',
      ordered: 'ordered',
      wild: 'wild',
      compact: 'compact',
      expansive: 'expansive',
      changed: 'Form field updated',
    },
    development: {
      title: 'Development',
      description: 'nonlinear mutation',
      ariaLabel: 'Developmental transformation',
      transformations: ['Ripple', 'Mirror', 'Flow', 'Echo', 'Carve', 'Bloom'],
    },
    fineTuning: {
      title: 'Fine tuning',
      geneCount: (count) => `${count} individual genes`,
    },
    groups: {
      form: { title: 'Form', description: 'generated mathematics' },
      structure: { title: 'Structure', description: 'resonance and polarity' },
      life: { title: 'Life', description: 'phase, motion and matter' },
    },
    controls: {
      scale: { label: 'Presence', description: 'Changes the overall scale.' },
      reach: { label: 'Reach', description: 'Widens or gathers the projection.' },
      fold: { label: 'Fold', description: 'Changes the curvature of the projection phase.' },
      lobes: { label: 'Lobes', description: 'Changes the number and rhythm of larger structures.' },
      tension: { label: 'Tension', description: 'Pulls the form between axial and radial states.' },
      mutation: { label: 'Mutation', description: 'Controls the generated developmental transformation.' },
      gesture: { label: 'Gesture', description: 'Bends the generated body axis from one posture into another.' },
      resonance: { label: 'Resonance', description: 'Amplifies or quietens nested oscillations.' },
      texture: { label: 'Texture', description: 'Changes the frequency of fine structures.' },
      polarity: { label: 'Polarity', description: 'Biases the transformation to one side or the other.' },
      phase: { label: 'Phase', description: 'Moves the creature through its internal cycle.' },
      motion: { label: 'Motion', description: 'Changes how quickly time enters the equation.' },
      pulse: { label: 'Colour wave', description: 'Changes the width of the travelling colour pulse.' },
      density: { label: 'Matter', description: 'Adds or removes sampled points without changing the equation.' },
    },
    colour: {
      title: 'Colour',
      description: 'generated, then editable',
      body: 'Body',
      pulse: 'Pulse',
    },
    screensaver: {
      title: 'Screensaver',
      description: 'export a preset for native screen savers',
      preview: 'Preview motion',
      download: 'Download .creature',
      exported: 'Screensaver preset downloaded',
      previewUnavailable: 'The screensaver preview could not be opened.',
    },
    code: {
      title: 'Equations and code',
      description: 'three views of the same creature',
      tabLabel: 'Equation and code formats',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'WebGL Editor' },
      tabDescriptions: {
        wolfram: 'The compact mathematical form.',
        p5js: 'The equation as a p5.js sketch.',
        webgl: 'The live WebGL shader. Edit it and apply the result directly.',
      },
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Copy failed',
      edit: 'Edit WebGL',
      editorLabel: 'Editable WebGL code',
      apply: 'Apply code',
      applying: 'Applying…',
      pending: 'Pending changes',
      discard: 'Discard changes',
      reset: 'Reset code',
      applied: 'Updated',
      synchronised: 'Updated',
      invalid: 'The code is incomplete or invalid.',
      compileFailed: (message) => `WebGL could not be compiled: ${message}`,
    },
    status: {
      saving: 'saving',
      savedLocally: 'saved locally',
      storageUnavailable: 'local storage unavailable',
      generated: 'New equation program generated',
      mutated: 'Creature mutated',
      tuningReset: 'Tuning reset',
      renderUnsupported: 'This laboratory needs a browser with WebGL 2 support.',
      renderLost: 'The graphics context was interrupted. The creature will return automatically.',
      noCoherentForm: 'No coherent form emerged. Try again.',
      generationFailed: 'The creature could not be generated.',
    },
    attribution: {
      label: 'Source attribution',
      p5By: 'p5.js by',
      wolframBy: 'Wolfram translation by',
      projectBy: 'Morphospace by',
    },
  },
  de: {
    documentTitle: 'MORPHOSPACE – eine mathematische Kreatur gestalten',
    description: 'Eine lebendige mathematische Form im Browser erzeugen, entwickeln und bearbeiten.',
    languageLabel: 'Sprache',
    brandMode: 'MORPHOSPACE',
    backToMuseum: 'Zurück zum Kreaturenmuseum',
    stageLabel: 'Live-Vorschau der Kreatur',
    specimen: {
      unnamed: 'Unbenannter Organismus',
      genome: (id) => `Genom ${id}`,
      points: (count) => `${count} Punkte`,
    },
    intro: {
      kicker: 'Gleichungslabor',
      title: 'Eine Kreatur erzeugen',
      body: 'Erzeuge ein neues Gleichungsprogramm und forme danach, was daraus entsteht. Sieben mathematische Topologien halten die Suche zusammenhängend, ohne eine Anatomie vorzuzeichnen.',
    },
    actions: {
      label: 'Werkzeuge des Generators',
      generate: 'Neu erzeugen',
      mutate: 'Mutieren',
      undo: 'Rückgängig',
      reset: 'Zurücksetzen',
    },
    evolution: {
      title: 'Evolution',
      description: 'Abstand zu diesem Exemplar',
      ariaLabel: 'Mutationsdistanz',
      modes: { close: 'Nah', bold: 'Markant', strange: 'Fremdartig' },
    },
    formField: {
      title: 'Formfeld',
      description: 'mehrere Gene zugleich formen',
      ariaLabel: 'Formfeld: links und rechts verändern die Ausdehnung, oben und unten die Komplexität',
      ordered: 'geordnet',
      wild: 'wild',
      compact: 'kompakt',
      expansive: 'weit',
      changed: 'Formfeld aktualisiert',
    },
    development: {
      title: 'Entwicklung',
      description: 'nichtlineare Mutation',
      ariaLabel: 'Entwicklungstransformation',
      transformations: ['Welle', 'Spiegel', 'Strömung', 'Echo', 'Kerbung', 'Blüte'],
    },
    fineTuning: {
      title: 'Feinabstimmung',
      geneCount: (count) => `${count} einzelne Gene`,
    },
    groups: {
      form: { title: 'Form', description: 'erzeugte Mathematik' },
      structure: { title: 'Struktur', description: 'Resonanz und Polarität' },
      life: { title: 'Leben', description: 'Phase, Bewegung und Materie' },
    },
    controls: {
      scale: { label: 'Präsenz', description: 'Verändert die Gesamtgrösse.' },
      reach: { label: 'Ausdehnung', description: 'Weitet oder bündelt die Projektion.' },
      fold: { label: 'Faltung', description: 'Verändert die Krümmung der Projektionsphase.' },
      lobes: { label: 'Lappen', description: 'Verändert Anzahl und Rhythmus grösserer Strukturen.' },
      tension: { label: 'Spannung', description: 'Zieht die Form zwischen axialen und radialen Zuständen.' },
      mutation: { label: 'Mutation', description: 'Steuert die erzeugte Entwicklungstransformation.' },
      gesture: { label: 'Geste', description: 'Biegt die erzeugte Körperachse von einer Haltung in eine andere.' },
      resonance: { label: 'Resonanz', description: 'Verstärkt oder beruhigt verschachtelte Schwingungen.' },
      texture: { label: 'Textur', description: 'Verändert die Frequenz feiner Strukturen.' },
      polarity: { label: 'Polarität', description: 'Gewichtet die Transformation zu einer Seite hin.' },
      phase: { label: 'Phase', description: 'Bewegt die Kreatur durch ihren inneren Zyklus.' },
      motion: { label: 'Bewegung', description: 'Verändert, wie schnell die Zeit in die Gleichung einfliesst.' },
      pulse: { label: 'Farbwelle', description: 'Verändert die Breite des wandernden Farbpulses.' },
      density: { label: 'Materie', description: 'Fügt abgetastete Punkte hinzu oder entfernt sie, ohne die Gleichung zu verändern.' },
    },
    colour: {
      title: 'Farbe',
      description: 'erzeugt, danach bearbeitbar',
      body: 'Körper',
      pulse: 'Puls',
    },
    screensaver: {
      title: 'Bildschirmschoner',
      description: 'Preset für native Bildschirmschoner exportieren',
      preview: 'Bewegung ansehen',
      download: '.creature laden',
      exported: 'Bildschirmschoner-Preset geladen',
      previewUnavailable: 'Die Bildschirmschoner-Vorschau konnte nicht geöffnet werden.',
    },
    code: {
      title: 'Gleichungen und Code',
      description: 'drei Ansichten derselben Kreatur',
      tabLabel: 'Formate für Gleichung und Code',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'WebGL-Editor' },
      tabDescriptions: {
        wolfram: 'Die kompakte mathematische Form.',
        p5js: 'Die Gleichung als p5.js-Skizze.',
        webgl: 'Der aktive WebGL-Shader. Bearbeite ihn und wende das Ergebnis direkt an.',
      },
      copy: 'Kopieren',
      copied: 'Kopiert',
      copyFailed: 'Kopieren fehlgeschlagen',
      edit: 'WebGL bearbeiten',
      editorLabel: 'Bearbeitbarer WebGL-Code',
      apply: 'Code anwenden',
      applying: 'Wird angewendet…',
      pending: 'Nicht angewendet',
      discard: 'Änderungen verwerfen',
      reset: 'Code zurücksetzen',
      applied: 'Aktualisiert',
      synchronised: 'Aktualisiert',
      invalid: 'Der Code ist unvollständig oder ungültig.',
      compileFailed: (message) => `WebGL konnte nicht kompiliert werden: ${message}`,
    },
    status: {
      saving: 'wird gespeichert',
      savedLocally: 'lokal gespeichert',
      storageUnavailable: 'lokaler Speicher nicht verfügbar',
      generated: 'Neues Gleichungsprogramm erzeugt',
      mutated: 'Kreatur mutiert',
      tuningReset: 'Anpassungen zurückgesetzt',
      renderUnsupported: 'Dieses Labor benötigt einen Browser mit WebGL-2-Unterstützung.',
      renderLost: 'Der Grafikkontext wurde unterbrochen. Die Kreatur kehrt automatisch zurück.',
      noCoherentForm: 'Es ist keine zusammenhängende Form entstanden. Versuche es erneut.',
      generationFailed: 'Die Kreatur konnte nicht erzeugt werden.',
    },
    attribution: {
      label: 'Quellenangabe',
      p5By: 'p5.js von',
      wolframBy: 'Wolfram-Übersetzung von',
      projectBy: 'Morphospace von',
    },
  },
  da: {
    documentTitle: 'MORPHOSPACE – skab et matematisk væsen',
    description: 'Skab, udvikl og redigér en levende matematisk form i browseren.',
    languageLabel: 'Sprog',
    brandMode: 'MORPHOSPACE',
    backToMuseum: 'Tilbage til museet for matematiske væsner',
    stageLabel: 'Direkte forhåndsvisning af væsenet',
    specimen: {
      unnamed: 'Unavngivet organisme',
      genome: (id) => `genom ${id}`,
      points: (count) => `${count} punkter`,
    },
    intro: {
      kicker: 'Ligningslaboratorium',
      title: 'Skab et væsen',
      body: 'Skab et nyt ligningsprogram, og tilpas derefter den form, der opstår. Syv matematiske topologier holder søgningen sammenhængende uden at tegne en anatomi på forhånd.',
    },
    actions: {
      label: 'Værktøjer',
      generate: 'Skab nyt',
      mutate: 'Mutér',
      undo: 'Fortryd',
      reset: 'Nulstil',
    },
    evolution: {
      title: 'Evolution',
      description: 'afstand fra dette eksemplar',
      ariaLabel: 'Mutationsafstand',
      modes: { close: 'Nær', bold: 'Markant', strange: 'Fremmedartet' },
    },
    formField: {
      title: 'Formfelt',
      description: 'form flere gener på én gang',
      ariaLabel: 'Formfelt: brug venstre og højre til spændvidde, op og ned til kompleksitet',
      ordered: 'ordnet',
      wild: 'vild',
      compact: 'kompakt',
      expansive: 'vid',
      changed: 'Formfelt opdateret',
    },
    development: {
      title: 'Udvikling',
      description: 'ikke-lineær mutation',
      ariaLabel: 'Udviklingstransformation',
      transformations: ['Bølge', 'Spejl', 'Strøm', 'Ekko', 'Udskæring', 'Blomstring'],
    },
    fineTuning: {
      title: 'Finjustering',
      geneCount: (count) => `${count} individuelle gener`,
    },
    groups: {
      form: { title: 'Form', description: 'genereret matematik' },
      structure: { title: 'Struktur', description: 'resonans og polaritet' },
      life: { title: 'Liv', description: 'fase, bevægelse og stof' },
    },
    controls: {
      scale: { label: 'Tilstedeværelse', description: 'Ændrer den samlede størrelse.' },
      reach: { label: 'Rækkevidde', description: 'Udvider eller samler projektionen.' },
      fold: { label: 'Foldning', description: 'Ændrer projektionsfasens krumning.' },
      lobes: { label: 'Lapper', description: 'Ændrer antallet og rytmen af større strukturer.' },
      tension: { label: 'Spænding', description: 'Trækker formen mellem aksiale og radiale tilstande.' },
      mutation: { label: 'Mutation', description: 'Styrer den genererede udviklingstransformation.' },
      gesture: { label: 'Gestus', description: 'Bøjer den genererede kropsakse fra én holdning til en anden.' },
      resonance: { label: 'Resonans', description: 'Forstærker eller dæmper indlejrede svingninger.' },
      texture: { label: 'Tekstur', description: 'Ændrer frekvensen af fine strukturer.' },
      polarity: { label: 'Polaritet', description: 'Forskyder transformationen mod den ene eller anden side.' },
      phase: { label: 'Fase', description: 'Bevæger væsenet gennem dets indre cyklus.' },
      motion: { label: 'Bevægelse', description: 'Ændrer, hvor hurtigt tiden indgår i ligningen.' },
      pulse: { label: 'Farvebølge', description: 'Ændrer bredden på den vandrende farveimpuls.' },
      density: { label: 'Stof', description: 'Tilføjer eller fjerner samplede punkter uden at ændre ligningen.' },
    },
    colour: {
      title: 'Farve',
      description: 'genereret og derefter redigerbar',
      body: 'Krop',
      pulse: 'Impuls',
    },
    screensaver: {
      title: 'Pauseskærm',
      description: 'eksportér dette eksemplar til en oprindelig visningsværtsapp',
      preview: 'Vis bevægelse',
      download: 'Hent .creature',
      exported: 'Pauseskærmspreset hentet',
      previewUnavailable: 'Forhåndsvisningen af pauseskærmen kunne ikke åbnes.',
    },
    code: {
      title: 'Ligninger og kode',
      description: 'tre visninger af det samme væsen',
      tabLabel: 'Lignings- og kodeformater',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'WebGL-editor' },
      tabDescriptions: {
        wolfram: 'Den kompakte matematiske form.',
        p5js: 'Ligningen som en p5.js-skitse.',
        webgl: 'Den aktive WebGL-shader. Redigér den, og anvend resultatet direkte.',
      },
      copy: 'Kopiér',
      copied: 'Kopieret',
      copyFailed: 'Kunne ikke kopieres',
      edit: 'Redigér WebGL',
      editorLabel: 'Redigerbar WebGL-kode',
      apply: 'Anvend kode',
      applying: 'Anvender…',
      pending: 'Afventer ændringer',
      discard: 'Kassér ændringer',
      reset: 'Nulstil kode',
      applied: 'Opdateret',
      synchronised: 'Opdateret',
      invalid: 'Koden er ufuldstændig eller ugyldig.',
      compileFailed: (message) => `WebGL kunne ikke kompileres: ${message}`,
    },
    status: {
      saving: 'gemmer',
      savedLocally: 'gemt lokalt',
      storageUnavailable: 'lokal lagring er ikke tilgængelig',
      generated: 'Nyt ligningsprogram skabt',
      mutated: 'Væsen muteret',
      tuningReset: 'Tilpasning nulstillet',
      renderUnsupported: 'Dette laboratorium kræver en browser med understøttelse af WebGL 2.',
      renderLost: 'Grafikkonteksten blev afbrudt. Væsenet vender automatisk tilbage.',
      noCoherentForm: 'Der opstod ingen sammenhængende form. Prøv igen.',
      generationFailed: 'Væsenet kunne ikke skabes.',
    },
    attribution: {
      label: 'Kildeangivelse',
      p5By: 'p5.js af',
      wolframBy: 'Wolfram-oversættelse af',
      projectBy: 'Morphospace af',
    },
  },
  fr: {
    documentTitle: 'MORPHOSPACE – créer une créature mathématique',
    description: 'Générez, faites évoluer et modifiez une forme mathématique vivante dans le navigateur.',
    languageLabel: 'Langue',
    brandMode: 'MORPHOSPACE',
    backToMuseum: 'Retour au musée des créatures',
    stageLabel: 'Aperçu en direct de la créature',
    specimen: {
      unnamed: 'Organisme sans nom',
      genome: (id) => `génome ${id}`,
      points: (count) => `${count} points`,
    },
    intro: {
      kicker: 'Laboratoire d’équations',
      title: 'Créer une créature',
      body: 'Générez un nouveau programme d’équations, puis façonnez la forme qui en émerge. Sept topologies mathématiques maintiennent une recherche cohérente sans dessiner d’anatomie au préalable.',
    },
    actions: {
      label: 'Actions du générateur',
      generate: 'Nouvelle création',
      mutate: 'Faire muter',
      undo: 'Annuler',
      reset: 'Réinitialiser',
    },
    evolution: {
      title: 'Évolution',
      description: 'distance par rapport à ce spécimen',
      ariaLabel: 'Distance de mutation',
      modes: { close: 'Proche', bold: 'Marquée', strange: 'Étrange' },
    },
    formField: {
      title: 'Champ de forme',
      description: 'façonner plusieurs gènes à la fois',
      ariaLabel: 'Champ de forme : gauche et droite règlent l’amplitude, haut et bas la complexité',
      ordered: 'ordonné',
      wild: 'sauvage',
      compact: 'compact',
      expansive: 'ample',
      changed: 'Champ de forme actualisé',
    },
    development: {
      title: 'Développement',
      description: 'mutation non linéaire',
      ariaLabel: 'Transformation du développement',
      transformations: ['Onde', 'Miroir', 'Flux', 'Écho', 'Sculpture', 'Floraison'],
    },
    fineTuning: {
      title: 'Réglage fin',
      geneCount: (count) => `${count} gènes individuels`,
    },
    groups: {
      form: { title: 'Forme', description: 'mathématiques générées' },
      structure: { title: 'Structure', description: 'résonance et polarité' },
      life: { title: 'Vie', description: 'phase, mouvement et matière' },
    },
    controls: {
      scale: { label: 'Présence', description: 'Modifie l’échelle générale.' },
      reach: { label: 'Étendue', description: 'Élargit ou resserre la projection.' },
      fold: { label: 'Pli', description: 'Modifie la courbure de la phase de projection.' },
      lobes: { label: 'Lobes', description: 'Modifie le nombre et le rythme des grandes structures.' },
      tension: { label: 'Tension', description: 'Étire la forme entre des états axiaux et radiaux.' },
      mutation: { label: 'Mutation', description: 'Contrôle la transformation de développement générée.' },
      gesture: { label: 'Geste', description: 'Infléchit l’axe du corps généré d’une posture vers une autre.' },
      resonance: { label: 'Résonance', description: 'Amplifie ou apaise les oscillations imbriquées.' },
      texture: { label: 'Texture', description: 'Modifie la fréquence des structures fines.' },
      polarity: { label: 'Polarité', description: 'Oriente la transformation vers un côté ou l’autre.' },
      phase: { label: 'Phase', description: 'Déplace la créature dans son cycle interne.' },
      motion: { label: 'Mouvement', description: 'Modifie la vitesse à laquelle le temps entre dans l’équation.' },
      pulse: { label: 'Onde colorée', description: 'Modifie la largeur de l’impulsion colorée qui parcourt la forme.' },
      density: { label: 'Matière', description: 'Ajoute ou retire des points échantillonnés sans modifier l’équation.' },
    },
    colour: {
      title: 'Couleur',
      description: 'générée, puis modifiable',
      body: 'Corps',
      pulse: 'Impulsion',
    },
    screensaver: {
      title: 'Économiseur d’écran',
      description: 'exporter ce spécimen pour un hôte d’affichage natif',
      preview: 'Prévisualiser le mouvement',
      download: 'Télécharger .creature',
      exported: 'Préréglage d’économiseur téléchargé',
      previewUnavailable: 'Impossible d’ouvrir l’aperçu de l’économiseur d’écran.',
    },
    code: {
      title: 'Équations et code',
      description: 'trois lectures de la même créature',
      tabLabel: 'Formats d’équation et de code',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'Éditeur WebGL' },
      tabDescriptions: {
        wolfram: 'La forme mathématique compacte.',
        p5js: 'L’équation sous la forme d’un croquis p5.js.',
        webgl: 'Le shader WebGL actif. Modifiez-le et appliquez directement le résultat.',
      },
      copy: 'Copier',
      copied: 'Copié',
      copyFailed: 'Échec de la copie',
      edit: 'Modifier WebGL',
      editorLabel: 'Code WebGL modifiable',
      apply: 'Appliquer le code',
      applying: 'Application…',
      pending: 'Modifications en attente',
      discard: 'Abandonner les modifications',
      reset: 'Réinitialiser le code',
      applied: 'Actualisé',
      synchronised: 'Actualisé',
      invalid: 'Le code est incomplet ou non valide.',
      compileFailed: (message) => `Impossible de compiler WebGL : ${message}`,
    },
    status: {
      saving: 'enregistrement',
      savedLocally: 'enregistré localement',
      storageUnavailable: 'stockage local indisponible',
      generated: 'Nouveau programme d’équations généré',
      mutated: 'Créature transformée',
      tuningReset: 'Réglages réinitialisés',
      renderUnsupported: 'Ce laboratoire nécessite un navigateur compatible avec WebGL 2.',
      renderLost: 'Le contexte graphique a été interrompu. La créature reviendra automatiquement.',
      noCoherentForm: 'Aucune forme cohérente n’a émergé. Réessayez.',
      generationFailed: 'La créature n’a pas pu être générée.',
    },
    attribution: {
      label: 'Attribution des sources',
      p5By: 'p5.js par',
      wolframBy: 'Traduction Wolfram par',
      projectBy: 'Morphospace par',
    },
  },
  it: {
    documentTitle: 'MORPHOSPACE – creare una creatura matematica',
    description: 'Genera, fai evolvere e modifica una forma matematica vivente nel browser.',
    languageLabel: 'Lingua',
    brandMode: 'MORPHOSPACE',
    backToMuseum: 'Torna al museo delle creature',
    stageLabel: 'Anteprima in tempo reale della creatura',
    specimen: {
      unnamed: 'Organismo senza nome',
      genome: (id) => `genoma ${id}`,
      points: (count) => `${count} punti`,
    },
    intro: {
      kicker: 'Laboratorio di equazioni',
      title: 'Crea una creatura',
      body: 'Genera un nuovo programma di equazioni, poi modella la forma che emerge. Sette topologie matematiche mantengono la ricerca coerente senza disegnare un’anatomia in anticipo.',
    },
    actions: {
      label: 'Azioni del generatore',
      generate: 'Genera nuova',
      mutate: 'Muta',
      undo: 'Annulla',
      reset: 'Ripristina',
    },
    evolution: {
      title: 'Evoluzione',
      description: 'distanza da questo esemplare',
      ariaLabel: 'Distanza della mutazione',
      modes: { close: 'Vicina', bold: 'Decisa', strange: 'Insolita' },
    },
    formField: {
      title: 'Campo di forma',
      description: 'modella più geni insieme',
      ariaLabel: 'Campo di forma: sinistra e destra regolano l’ampiezza, alto e basso la complessità',
      ordered: 'ordinato',
      wild: 'selvaggio',
      compact: 'compatto',
      expansive: 'ampio',
      changed: 'Campo di forma aggiornato',
    },
    development: {
      title: 'Sviluppo',
      description: 'mutazione non lineare',
      ariaLabel: 'Trasformazione dello sviluppo',
      transformations: ['Onda', 'Specchio', 'Flusso', 'Eco', 'Incisione', 'Fioritura'],
    },
    fineTuning: {
      title: 'Regolazione fine',
      geneCount: (count) => `${count} geni individuali`,
    },
    groups: {
      form: { title: 'Forma', description: 'matematica generata' },
      structure: { title: 'Struttura', description: 'risonanza e polarità' },
      life: { title: 'Vita', description: 'fase, movimento e materia' },
    },
    controls: {
      scale: { label: 'Presenza', description: 'Modifica la scala complessiva.' },
      reach: { label: 'Estensione', description: 'Allarga o raccoglie la proiezione.' },
      fold: { label: 'Piega', description: 'Modifica la curvatura della fase di proiezione.' },
      lobes: { label: 'Lobi', description: 'Modifica il numero e il ritmo delle strutture maggiori.' },
      tension: { label: 'Tensione', description: 'Tende la forma tra stati assiali e radiali.' },
      mutation: { label: 'Mutazione', description: 'Controlla la trasformazione dello sviluppo generata.' },
      gesture: { label: 'Gesto', description: 'Piega l’asse corporeo generato da una postura all’altra.' },
      resonance: { label: 'Risonanza', description: 'Amplifica o attenua le oscillazioni annidate.' },
      texture: { label: 'Trama', description: 'Modifica la frequenza delle strutture fini.' },
      polarity: { label: 'Polarità', description: 'Orienta la trasformazione verso un lato o l’altro.' },
      phase: { label: 'Fase', description: 'Muove la creatura attraverso il suo ciclo interno.' },
      motion: { label: 'Movimento', description: 'Modifica la velocità con cui il tempo entra nell’equazione.' },
      pulse: { label: 'Onda di colore', description: 'Modifica l’ampiezza dell’impulso di colore che percorre la forma.' },
      density: { label: 'Materia', description: 'Aggiunge o rimuove punti campionati senza modificare l’equazione.' },
    },
    colour: {
      title: 'Colore',
      description: 'generato, poi modificabile',
      body: 'Corpo',
      pulse: 'Impulso',
    },
    screensaver: {
      title: 'Salvaschermo',
      description: 'esporta questo esemplare per un host di visualizzazione nativo',
      preview: 'Anteprima del movimento',
      download: 'Scarica .creature',
      exported: 'Preset del salvaschermo scaricato',
      previewUnavailable: 'Impossibile aprire l’anteprima del salvaschermo.',
    },
    code: {
      title: 'Equazioni e codice',
      description: 'tre letture della stessa creatura',
      tabLabel: 'Formati di equazioni e codice',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'Editor WebGL' },
      tabDescriptions: {
        wolfram: 'La forma matematica compatta.',
        p5js: 'L’equazione come schizzo p5.js.',
        webgl: 'Lo shader WebGL attivo. Modificalo e applica direttamente il risultato.',
      },
      copy: 'Copia',
      copied: 'Copiato',
      copyFailed: 'Copia non riuscita',
      edit: 'Modifica WebGL',
      editorLabel: 'Codice WebGL modificabile',
      apply: 'Applica codice',
      applying: 'Applicazione…',
      pending: 'Modifiche in sospeso',
      discard: 'Annulla modifiche',
      reset: 'Ripristina codice',
      applied: 'Aggiornato',
      synchronised: 'Aggiornato',
      invalid: 'Il codice è incompleto o non valido.',
      compileFailed: (message) => `Impossibile compilare WebGL: ${message}`,
    },
    status: {
      saving: 'salvataggio',
      savedLocally: 'salvato localmente',
      storageUnavailable: 'archiviazione locale non disponibile',
      generated: 'Nuovo programma di equazioni generato',
      mutated: 'Creatura mutata',
      tuningReset: 'Regolazioni ripristinate',
      renderUnsupported: 'Questo laboratorio richiede un browser compatibile con WebGL 2.',
      renderLost: 'Il contesto grafico è stato interrotto. La creatura tornerà automaticamente.',
      noCoherentForm: 'Non è emersa alcuna forma coerente. Riprova.',
      generationFailed: 'Non è stato possibile generare la creatura.',
    },
    attribution: {
      label: 'Attribuzione delle fonti',
      p5By: 'p5.js di',
      wolframBy: 'Traduzione Wolfram di',
      projectBy: 'Morphospace di',
    },
  },
  ja: {
    documentTitle: 'MORPHOSPACE – 数学的な生き物をつくる',
    description: 'ブラウザで、生きているような数学的形態を生成し、進化させ、編集します。',
    languageLabel: '言語',
    brandMode: 'MORPHOSPACE',
    backToMuseum: '生き物の博物館に戻る',
    stageLabel: '生き物のライブプレビュー',
    specimen: {
      unnamed: '名前のない生命体',
      genome: (id) => `ゲノム ${id}`,
      points: (count) => `${count}点`,
    },
    intro: {
      kicker: '方程式ラボ',
      title: '生き物を生成する',
      body: '新しい方程式プログラムを生成し、そこから現れる形を調整します。7つの数学的トポロジーが、解剖学を描き込むことなく、探索にまとまりを与えます。',
    },
    actions: {
      label: '生成ツール',
      generate: '新しく生成',
      mutate: '変異させる',
      undo: '元に戻す',
      reset: 'リセット',
    },
    evolution: {
      title: '進化',
      description: 'この個体からの距離',
      ariaLabel: '変異の距離',
      modes: { close: '近縁', bold: '大胆', strange: '異形' },
    },
    formField: {
      title: '形態フィールド',
      description: '複数の遺伝子を同時に形づくる',
      ariaLabel: '形態フィールド：左右で広がり、上下で複雑さを調整',
      ordered: '整然',
      wild: '奔放',
      compact: '凝縮',
      expansive: '拡張',
      changed: '形態フィールドを更新しました',
    },
    development: {
      title: '発生',
      description: '非線形変異',
      ariaLabel: '発生変換',
      transformations: ['波紋', '鏡像', '流動', '残響', '彫刻', '開花'],
    },
    fineTuning: {
      title: '微調整',
      geneCount: (count) => `${count}個の遺伝子`,
    },
    groups: {
      form: { title: '形態', description: '生成された数学' },
      structure: { title: '構造', description: '共鳴と極性' },
      life: { title: '生命感', description: '位相、動き、密度' },
    },
    controls: {
      scale: { label: '存在感', description: '全体の大きさを変えます。' },
      reach: { label: '広がり', description: '投影を広げたり集めたりします。' },
      fold: { label: '折り', description: '投影位相の曲率を変えます。' },
      lobes: { label: '葉状部', description: '大きな構造の数とリズムを変えます。' },
      tension: { label: '張力', description: '軸状と放射状の状態の間で形を引き延ばします。' },
      mutation: { label: '変異', description: '生成された発生変換を制御します。' },
      gesture: { label: '姿勢', description: '生成された体軸を別の姿勢へ曲げます。' },
      resonance: { label: '共鳴', description: '入れ子になった振動を強めたり鎮めたりします。' },
      texture: { label: '質感', description: '細かな構造の周波数を変えます。' },
      polarity: { label: '極性', description: '変換をどちらか一方に偏らせます。' },
      phase: { label: '位相', description: '生き物を内部周期の中で移動させます。' },
      motion: { label: '動き', description: '時間が方程式に入る速さを変えます。' },
      pulse: { label: '色の波', description: '形を走る色のパルスの幅を変えます。' },
      density: { label: '密度', description: '方程式を変えずに標本点を増減します。' },
    },
    colour: {
      title: '色',
      description: '生成後に編集可能',
      body: '本体',
      pulse: 'パルス',
    },
    screensaver: {
      title: 'スクリーンセーバー',
      description: 'この標本をネイティブ表示ホスト用に書き出します',
      preview: '動きをプレビュー',
      download: '.creature をダウンロード',
      exported: 'スクリーンセーバーのプリセットをダウンロードしました',
      previewUnavailable: 'スクリーンセーバーのプレビューを開けませんでした。',
    },
    code: {
      title: '方程式とコード',
      description: '同じ生き物を表す3つの形式',
      tabLabel: '方程式とコードの形式',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'WebGLエディター' },
      tabDescriptions: {
        wolfram: '簡潔な数学表現です。',
        p5js: '方程式をp5.jsスケッチとして表します。',
        webgl: '実行中のWebGLシェーダーです。編集して結果を直接適用できます。',
      },
      copy: 'コピー',
      copied: 'コピーしました',
      copyFailed: 'コピーできませんでした',
      edit: 'WebGLを編集',
      editorLabel: '編集可能なWebGLコード',
      apply: 'コードを適用',
      applying: '適用中…',
      pending: '未適用の変更',
      discard: '変更を破棄',
      reset: 'コードをリセット',
      applied: '更新済み',
      synchronised: '更新済み',
      invalid: 'コードが不完全か、正しくありません。',
      compileFailed: (message) => `WebGLをコンパイルできませんでした：${message}`,
    },
    status: {
      saving: '保存中',
      savedLocally: 'ローカルに保存済み',
      storageUnavailable: 'ローカル保存を利用できません',
      generated: '新しい方程式プログラムを生成しました',
      mutated: '生き物を変異させました',
      tuningReset: '調整をリセットしました',
      renderUnsupported: 'このラボにはWebGL 2対応ブラウザが必要です。',
      renderLost: 'グラフィックスの接続が中断されました。生き物は自動的に戻ります。',
      noCoherentForm: 'まとまりのある形が現れませんでした。もう一度お試しください。',
      generationFailed: '生き物を生成できませんでした。',
    },
    attribution: {
      label: '出典',
      p5By: 'p5.js制作',
      wolframBy: 'Wolfram翻訳',
      projectBy: 'Morphospace制作',
    },
  },
  es: {
    documentTitle: 'MORPHOSPACE – crear una criatura matemática',
    description: 'Genera, evoluciona y edita una forma matemática viva en el navegador.',
    languageLabel: 'Idioma',
    brandMode: 'MORPHOSPACE',
    backToMuseum: 'Volver al museo de criaturas',
    stageLabel: 'Vista previa de la criatura en vivo',
    specimen: {
      unnamed: 'Organismo sin nombre',
      genome: (id) => `genoma ${id}`,
      points: (count) => `${count} puntos`,
    },
    intro: {
      kicker: 'Laboratorio de ecuaciones',
      title: 'Genera una criatura',
      body: 'Genera un nuevo programa de ecuaciones y ajusta después la forma que emerge. Siete topologías matemáticas mantienen la búsqueda coherente sin dibujar una anatomía de antemano.',
    },
    actions: {
      label: 'Acciones del generador',
      generate: 'Generar nueva',
      mutate: 'Mutar',
      undo: 'Deshacer',
      reset: 'Restablecer',
    },
    evolution: {
      title: 'Evolución',
      description: 'distancia respecto a este ejemplar',
      ariaLabel: 'Distancia de mutación',
      modes: { close: 'Cercana', bold: 'Marcada', strange: 'Extraña' },
    },
    formField: {
      title: 'Campo de forma',
      description: 'moldea varios genes a la vez',
      ariaLabel: 'Campo de forma: izquierda y derecha controlan la amplitud; arriba y abajo, la complejidad',
      ordered: 'ordenado',
      wild: 'salvaje',
      compact: 'compacto',
      expansive: 'amplio',
      changed: 'Campo de forma actualizado',
    },
    development: {
      title: 'Desarrollo',
      description: 'mutación no lineal',
      ariaLabel: 'Transformación del desarrollo',
      transformations: ['Onda', 'Espejo', 'Flujo', 'Eco', 'Tallado', 'Floración'],
    },
    fineTuning: {
      title: 'Ajuste fino',
      geneCount: (count) => `${count} genes individuales`,
    },
    groups: {
      form: { title: 'Forma', description: 'matemáticas generadas' },
      structure: { title: 'Estructura', description: 'resonancia y polaridad' },
      life: { title: 'Vida', description: 'fase, movimiento y materia' },
    },
    controls: {
      scale: { label: 'Presencia', description: 'Cambia la escala general.' },
      reach: { label: 'Alcance', description: 'Amplía o recoge la proyección.' },
      fold: { label: 'Pliegue', description: 'Cambia la curvatura de la fase de proyección.' },
      lobes: { label: 'Lóbulos', description: 'Cambia el número y el ritmo de las estructuras mayores.' },
      tension: { label: 'Tensión', description: 'Tensa la forma entre estados axiales y radiales.' },
      mutation: { label: 'Mutación', description: 'Controla la transformación de desarrollo generada.' },
      gesture: { label: 'Gesto', description: 'Curva el eje corporal generado de una postura a otra.' },
      resonance: { label: 'Resonancia', description: 'Amplifica o suaviza las oscilaciones anidadas.' },
      texture: { label: 'Textura', description: 'Cambia la frecuencia de las estructuras finas.' },
      polarity: { label: 'Polaridad', description: 'Inclina la transformación hacia uno u otro lado.' },
      phase: { label: 'Fase', description: 'Mueve la criatura a través de su ciclo interno.' },
      motion: { label: 'Movimiento', description: 'Cambia la rapidez con la que el tiempo entra en la ecuación.' },
      pulse: { label: 'Onda de color', description: 'Cambia la anchura del pulso de color que recorre la forma.' },
      density: { label: 'Materia', description: 'Añade o elimina puntos muestreados sin cambiar la ecuación.' },
    },
    colour: {
      title: 'Color',
      description: 'generado y después editable',
      body: 'Cuerpo',
      pulse: 'Pulso',
    },
    screensaver: {
      title: 'Salvapantallas',
      description: 'exporta este ejemplar para un host de visualización nativo',
      preview: 'Previsualizar movimiento',
      download: 'Descargar .creature',
      exported: 'Preajuste de salvapantallas descargado',
      previewUnavailable: 'No se pudo abrir la previsualización del salvapantallas.',
    },
    code: {
      title: 'Ecuaciones y código',
      description: 'tres formas de ver la misma criatura',
      tabLabel: 'Formatos de ecuaciones y código',
      tabs: { wolfram: 'Wolfram', p5js: 'p5.js', webgl: 'Editor WebGL' },
      tabDescriptions: {
        wolfram: 'La forma matemática compacta.',
        p5js: 'La ecuación como boceto de p5.js.',
        webgl: 'El shader WebGL activo. Edítalo y aplica el resultado directamente.',
      },
      copy: 'Copiar',
      copied: 'Copiado',
      copyFailed: 'No se pudo copiar',
      edit: 'Editar WebGL',
      editorLabel: 'Código WebGL editable',
      apply: 'Aplicar código',
      applying: 'Aplicando…',
      pending: 'Cambios pendientes',
      discard: 'Descartar cambios',
      reset: 'Restablecer código',
      applied: 'Actualizado',
      synchronised: 'Actualizado',
      invalid: 'El código está incompleto o no es válido.',
      compileFailed: (message) => `No se pudo compilar WebGL: ${message}`,
    },
    status: {
      saving: 'guardando',
      savedLocally: 'guardado localmente',
      storageUnavailable: 'almacenamiento local no disponible',
      generated: 'Nuevo programa de ecuaciones generado',
      mutated: 'Criatura mutada',
      tuningReset: 'Ajustes restablecidos',
      renderUnsupported: 'Este laboratorio necesita un navegador compatible con WebGL 2.',
      renderLost: 'El contexto gráfico se ha interrumpido. La criatura volverá automáticamente.',
      noCoherentForm: 'No ha surgido una forma coherente. Inténtalo de nuevo.',
      generationFailed: 'No se pudo generar la criatura.',
    },
    attribution: {
      label: 'Atribución de fuentes',
      p5By: 'p5.js de',
      wolframBy: 'Traducción Wolfram de',
      projectBy: 'Morphospace de',
    },
  },
};

export function resolveBuilderLocale(languages?: readonly string[]): BuilderLocale {
  const browserLanguages = languages ?? (
    typeof navigator === 'undefined'
      ? []
      : navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language]
  );
  return resolveLocale(browserLanguages) as BuilderLocale;
}

export function getBuilderTranslation(languages?: readonly string[]): BuilderTranslation {
  return BUILDER_TRANSLATIONS[resolveBuilderLocale(languages)];
}

export function isBuilderLocale(value: string): value is BuilderLocale {
  return BUILDER_LOCALES.includes(value as BuilderLocale);
}

export function localeFromBuilderLanguage(language: string): Locale {
  return resolveLocale([language]);
}
