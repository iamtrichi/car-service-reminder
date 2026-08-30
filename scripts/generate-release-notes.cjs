#!/usr/bin/env node
/**
 * generate-release-notes.cjs
 *
 * Generates Play Store release notes for the Car Service Reminder Android app,
 * in the exact multi-locale format Play Console expects.
 *
 * What it does:
 *   1. Reads the current versionCode / versionName from android/app/build.gradle.
 *   2. Walks git history to find the last commit that carried a *different*
 *      versionCode (i.e. the previous release bump) and collects every user-facing
 *      commit since then (infrastructure commits are filtered out).
 *   3. Categorizes each commit (feature / bugfix / update / data) and rewrites it
 *      as a user-facing English bullet.
 *   4. Translates each bullet into the five locales the app ships (en-US, ar,
 *      es-ES, fr-FR, pt-PT) using a curated phrase dictionary that matches the
 *      published release-notes style.
 *   5. Prints the final "Release notes;" block ready to paste into Play Console,
 *      or writes it to a file with --output.
 *
 * Usage:
 *   node scripts/generate-release-notes.cjs                     # draft to stdout
 *   node scripts/generate-release-notes.cjs --json              # structured commit data
 *   node scripts/generate-release-notes.cjs --from 7cb052c      # override range start
 *   node scripts/generate-release-notes.cjs --to HEAD
 *   node scripts/generate-release-notes.cjs --output releases/V1.39-notes.txt
 *   node scripts/generate-release-notes.cjs --version-name 1.39 --version-code 39
 *   node scripts/generate-release-notes.cjs --all               # treat all history as the range
 *
 * NOTE: This is a *drafting* tool. Commit subjects are terse; the agent wrapping
 * this script reviews the --json output, splits compound commits, and polishes
 * the translations (see .opencode/agent/release-notes-generator.md).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BUILD_GRADLE = path.join(REPO_ROOT, 'android', 'app', 'build.gradle');
const MAKES_INDEX = path.join(REPO_ROOT, 'public', 'config', 'makes', 'all-makes-models.json');

// App locale -> Play Store locale code (order matters: output follows this order)
const LOCALES = ['en-US', 'ar', 'es-ES', 'fr-FR', 'pt-PT'];

// Play Store locale -> bullet object property key used across the dictionary
const LOCALE_KEY = { 'en-US': 'en', ar: 'ar', 'es-ES': 'es', 'fr-FR': 'fr', 'pt-PT': 'pt' };
// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { output: null, json: false, from: null, to: 'HEAD', versionName: null, versionCode: null, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--json': args.json = true; break;
      case '--all': args.all = true; break;
      case '--output':
      case '--from':
      case '--to':
      case '--version-name':
      case '--version-code':
        args[a.slice(2)] = argv[++i];
        break;
      default:
        if (a.startsWith('--')) {
          console.error('Unknown option: ' + a);
          process.exit(1);
        }
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------
function git(args) {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', shell: false });
  if (r.status !== 0) {
    return { ok: false, stdout: '', stderr: (r.stderr || '').trim() };
  }
  return { ok: true, stdout: r.stdout.trim() };
}

function getChangedPaths(hash) {
  const r = git(['show', '--format=', '--name-only', hash]);
  if (!r.ok) return [];
  return r.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------
function readGradle(txt) {
  const code = txt.match(/versionCode\s+(\d+)/);
  const name = txt.match(/versionName\s+"([^"]+)"/);
  return { versionCode: code ? code[1] : null, versionName: name ? name[1] : null };
}

function readVersion(cli) {
  const cur = readGradle(fs.readFileSync(BUILD_GRADLE, 'utf8'));
  return {
    versionCode: cli.versionCode || cur.versionCode,
    versionName: cli.versionName || cur.versionName,
  };
}

function versionAtCommit(hash) {
  const r = git(['show', hash + ':android/app/build.gradle']);
  if (!r.ok) return { versionCode: null };
  return readGradle(r.stdout);
}

/** Most recent commit where the versionCode was DIFFERENT from the current one. */
function findPrevBump(currentCode) {
  const r = git(['log', '--format=%H%x09%s', '--', 'android/app/build.gradle']);
  if (!r.ok) return null;
  const lines = r.stdout.split('\n').filter(Boolean);
  for (const line of lines) {
    const [hash, ...rest] = line.split('\t');
    const v = versionAtCommit(hash);
    if (v.versionCode !== currentCode) {
      return { hash, subject: rest.join('\t'), version: v };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Infra-commit filtering
// ---------------------------------------------------------------------------
const SKIP_SUBJECT_RE =
  /^(?:\d+(?:\.\d+)*|v[\s.]?\d+(?:\.\d+)*\s*|v\d+(?:\.\d+)* release|new version|published version|latest version(?:code)?\s*|.*version ?code\s*$|9 version code)\s*$|\.nvmrc|skills? and ai\b|agents\.md|skillss?\b|readme|prerequisit|changelog|release.?notes|testing ads|cleanup old|refactor|initial commit|\.gitignore|importing\b/i;

const SKIP_PATH_PREFIXES = [
  '.clinerules/', '.opencode/', 'skills/', 'scripts/', 'backups/',
  'dist/', 'assets/', 'icons/', 'node_modules/',
  'agents.md', 'SKILLS.md', 'README.md',
  '.gitignore', '.nvmrc', 'package.json', 'package-lock.json',
  'tsconfig.json', 'vite.config.ts', 'ionic.config.json',
  'index.html', 'capacitor.config.ts', 'android/local.properties',
  'android/gradle.properties',
];

function isVersionBump(subject) {
  const s = subject.trim();
  if (/^\d+(\.\d+)*$/.test(s)) return true; // bare "38"
  if (/^v[\s.]?\d+(\.\d+)*\s*$/i.test(s)) return true; // "V.1.37"
  // Version-prefixed subjects with no user-facing verb (e.g. "v1.35 enable ads")
  if (/^v[\s.]?\d+(\.\d+)*[\s.:-]/i.test(s) && !VERB_RE.test(s)) return true;
  return false;
}

function isInfraCommit(subject, paths) {
  if (isVersionBump(subject)) return true;
  if (SKIP_SUBJECT_RE.test(subject)) return true;
  if (paths.length === 0) return false;
  return paths.every((p) => SKIP_PATH_PREFIXES.some((pre) => p === pre || p.startsWith(pre)));
}

/** Loads the make list from the config index file. */
function loadMakes() {
  if (!fs.existsSync(MAKES_INDEX)) return [];
  try {
    const idx = JSON.parse(fs.readFileSync(MAKES_INDEX, 'utf8'));
    return (idx.makes || []).map((m) => m.make).filter(Boolean);
  } catch {
    return [];
  }
}
// ---------------------------------------------------------------------------
// Curated phrase dictionary
// ---------------------------------------------------------------------------
// Each entry maps a commit-subject regex to ready-to-use bullets in all five
// locales. These mirrorsi the tone/wording of the published release notes.
// Order matters: the FIRST matching entry wins, so specific patterns come first.
const KNOWN_PHRASES = [
  {
    test: /recommended services? (generation|creation)/i,
    cat: 'fix',
    en: 'Fixed Recommended Services Generation',
    ar: 'تم إصلاح توليد الخدمات الموصى بها',
    es: 'Se corrigió la generación de servicios recomendados',
    fr: 'Correction de la génération des services recommandés',
    pt: 'Correção da geração de serviços recomendados',
  },
  {
    test: /duplicat(ed|e)? engines?|engines? (duplicat|dupliqu)/i,
    cat: 'fix',
    en: 'Fixed duplicate engines',
    ar: 'تمت إزالة المحركات المكررة',
    es: 'Se eliminaron los motores duplicados',
    fr: 'Suppression des moteurs en double',
    pt: 'Motores duplicados removidos',
  },
  {
    test: /version (check|gate|verif)|(check|gate).*version/i,
    cat: 'feature',
    en: 'Added a version check gate',
    ar: 'تمت إضافة بوابة التحقق من الإصدار',
    es: 'Se agregó la función de verificación de versión',
    fr: "Ajout d'un système de vérification de version",
    pt: 'Adicionada a funcionalidade de verificação de versão',
  },
  {
    test: /(fix(ed|es)?|correc).*\bads?\b|\bads?\b.*(fix(ed|es)?|correc)/i,
    cat: 'fix',
    en: 'Fixed ads',
    ar: 'تم إصلاح الإعلانات',
    es: 'Se corrigieron los anuncios',
    fr: 'Correction des publicités',
    pt: 'Anúncios corrigidos',
  },
  {
    test: /backup|restore data|same data/i,
    cat: 'feature',
    en: 'Added automatic backup so your data stays the same when changing devices',
    ar: 'إضافة نسخ احتياطي تلقائي لضمان الحصول على نفس البيانات عند تغيير الجهاز',
    es: 'Se añadió copia de seguridad automática para conservar los mismos datos al cambiar de dispositivo',
    fr: "Ajout d'une sauvegarde automatique afin de conserver les mêmes données en cas de changement d'appareil",
    pt: 'Adição de cópia de segurança automática para manter os mesmos dados ao mudar de dispositivo',
  },
  {
    test: /contact\s?(us|ez|e)/i,
    cat: 'feature',
    en: "Added a Contact Us feature for users who can't find their car",
    ar: 'إضافة ميزة "اتصل بنا" في حال واجه المستخدم مشكلة في العثور على سيارته',
    es: 'Se añadió la función de contacto para usuarios que no encuentren su coche',
    fr: 'Ajout d\'une fonctionnalité "Contactez-nous" pour les utilisateurs qui ne trouvent pas leur voiture',
    pt: 'Adição da funcionalidade "Contacte-nos" para utilizadores que não encontrem o seu carro',
  },
  {
    test: /notification.*schedul|schedul.*notification|notification.?schedule/i,
    cat: 'feature',
    en: 'Added notification scheduling (default: daily at 10:00 AM)',
    ar: 'إضافة ميزة جدولة الإشعارات (الافتراضي هو يومياً الساعة 10:00 صباحاً)',
    es: 'Se añadió la función de programación de notificaciones (predeterminado: diariamente a las 10:00)',
    fr: 'Ajout de la fonction de planification des notifications (par défaut : quotidienne à 10h00)',
    pt: 'Adição da funcionalidade de agendamento de notificações (padrão: diariamente às 10:00)',
  },
  {
    test: /notification.?banner|banner/i,
    cat: 'feature',
    en: 'Added a notifications banner on the Dashboard and Reminders pages',
    ar: 'إضافة شريط إشعارات في صفحتي لوحة التحكم والتذكيرات',
    es: 'Se añadió un banner de notificaciones en el panel y en recordatorios',
    fr: "Ajout d'une bannière de notifications sur le tableau de bord et les rappels",
    pt: 'Adição de uma faixa de notificações no painel e nos lembretes',
  },
  {
    test: /reminder(s| page|s page)?\s*(ui|page|design|screen)/i,
    cat: 'update',
    en: 'Updated the Reminders page design',
    ar: 'تحديث تصميم صفحة التذكيرات',
    es: 'Se actualizó el diseño de la página de recordatorios',
    fr: 'Mise à jour du design de la page des rappels',
    pt: 'Atualização do design da página de lembretes',
  },
  {
    test: /add(ing|ed)? (a )?(car|vehicle)|(add|adding).*vehicle/i,
    cat: 'fix',
    en: 'Fixed issues when adding a vehicle',
    ar: 'إصلاح مشاكل إضافة سيارة',
    es: 'Se corrigieron los problemas al añadir un vehículo',
    fr: "Correction des problèmes lors de l'ajout d'un véhicule",
    pt: 'Correção de problemas ao adicionar um veículo',
  },
  {
    test: /service.*intervals|intervals.*service|(\bfix\w*).*interval/i,
    cat: 'fix',
    en: 'Fixed service intervals',
    ar: 'إصلاح فترات الصيانة',
    es: 'Se corrigieron los intervalos de servicio',
    fr: 'Correction des intervalles d\'entretien',
    pt: 'Correção dos intervalos de serviço',
  },
  {
    test: /hybrid.*\b(service|oil)|ev services?|electric.*service/i,
    cat: 'fix',
    en: 'Fixed services for hybrid and electric vehicles',
    ar: 'إصلاح خدمات السيارات الهجينة والكهربائية',
    es: 'Se corrigieron los servicios para vehículos híbridos y eléctricos',
    fr: 'Correction des services pour les véhicules hybrides et électriques',
    pt: 'Correção dos serviços para veículos híbridos e elétricos',
  },
  {
    test: /mhev|mild hybrid|gasoline/i,
    cat: 'fix',
    en: 'Fixed the fuel type of MHEV vehicles (now gasoline)',
    ar: 'تصحيح نوع الوقود للسيارات الهجينة الخفيفة MHEV (بنزين)',
    es: 'Se corrigió el tipo de combustible de los híbridos ligeros MHEV (gasolina)',
    fr: 'Correction du type de carburant des MHEV (essence)',
    pt: 'Correção do tipo de combustível dos MHEV (gasolina)',
  },
{
    test: /fuel|consumption|liters|litres|tank/i,
    cat: 'feature',
    en: 'Added fuel consumption tracking',
    ar: 'إضافة تتبع استهلاك الوقود',
    es: 'Se añadió el seguimiento del consumo de combustible',
    fr: 'Ajout du suivi de la consommation de carburant',
    pt: 'Adição do acompanhamento do consumo de combustível',
  },
  {
    test: /expense|statistics|stats|spend/i,
    cat: 'feature',
    en: 'Added expense statistics',
    ar: 'إضافة إحصائيات النفقات',
    es: 'Se añadieron estadísticas de gastos',
    fr: 'Ajout des statistiques de dépenses',
    pt: 'Adição de estatísticas de despesas',
  },
  {
    test: /currency|devise|moneda|moeda/i,
    cat: 'feature',
    en: 'Added currency settings with all currencies supported',
    ar: 'إضافة إعدادات العملة مع دعم جميع العملات',
    es: 'Se añadieron ajustes de moneda con todas las divisas admitidas',
    fr: 'Ajout des paramètres de devise avec toutes les devises prises en charge',
    pt: 'Adição de definições de moeda com todas as moedas suportadas',
  },
  {
    test: /vin/i,
    cat: 'feature',
    en: 'Added VIN scanning and decoding',
    ar: 'إضافة مسح وفك ترميز رقم VIN',
    es: 'Se añadió el escaneo y descodificación del VIN',
    fr: 'Ajout du scan et du décodage VIN',
    pt: 'Adição da leitura e descodificação do VIN',
  },
  {
    test: /image|photo|picture|logo|splash|icon/i,
    cat: 'feature',
    en: 'Added car images and brand logos',
    ar: 'إضافة صور السيارات وشعارات الماركات',
    es: 'Se añadieron imágenes de coches y logotipos de marcas',
    fr: "Ajout d'images de voitures et de logos de marques",
    pt: 'Adição de imagens de carros e logótipos de marcas',
  },
  {
    test: /document|insurance|registration|vignette|inspection|carte grise/i,
    cat: 'feature',
    en: 'Added vehicle document tracking (registration, insurance, inspection and more)',
    ar: 'إضافة تتبع مستندات السيارة (الترخيص، التأمين، الفحص الفني وغيرها)',
    es: 'Se añadió el seguimiento de documentos del vehículo (matrícula, seguro, inspección y más)',
    fr: 'Ajout du suivi des documents du véhicule (carte grise, assurance, contrôle technique et plus)',
    pt: 'Adição do acompanhamento de documentos do veículo (matrícula, seguro, inspeção e mais)',
  },
  {
    test: /language|locale|translat|locali[sz]e|arabic|spanish|portuguese|french/i,
    cat: 'feature',
    en: 'Translated the app into more languages',
    ar: 'ترجمة التطبيق إلى لغات أخرى',
    es: 'Se tradujo la aplicación a más idiomas',
    fr: "Traduction de l'application dans plus de langues",
    pt: 'Tradução da aplicação para mais idiomas',
  },
  {
    test: /back button|back navigation/i,
    cat: 'fix',
    en: 'Fixed native back button navigation',
    ar: 'إصلاح زر الرجوع الأصلي',
    es: 'Se corrigió la navegación con el botón de retroceso',
    fr: 'Correction de la navigation avec le bouton retour',
    pt: 'Correção da navegação com o botão de retroceder',
  },
  {
    test: /keyboard.*(cover|hide)|cover.*keyboard/i,
    cat: 'fix',
    en: 'Fixed the keyboard covering the input forms',
    ar: 'إصلاح مشكلة تغطية لوحة المفاتيح للنماذج',
    es: 'Se corrigió que el teclado tapara los formularios',
    fr: 'Correction du clavier qui masquait les formulaires',
    pt: 'Correção do teclado a cobrir os formulários',
  },
  {
    test: /blank\s?page/i,
    cat: 'fix',
    en: 'Fixed a blank page after deleting a vehicle',
    ar: 'إصلاح صفحة فارغة بعد حذف سيارة',
    es: 'Se corrigió una página en blanco al eliminar un vehículo',
    fr: "Correction d'une page blanche après la suppression d'un véhicule",
    pt: 'Correção de uma página em branco ao eliminar um veículo',
  },
  {
    test: /sort.*(reminder|service)|order.*(reminder|service)/i,
    cat: 'update',
    en: 'Improved reminders sorting',
    ar: 'تحسين ترتيب التذكيرات',
    es: 'Se mejoró el orden de los recordatorios',
    fr: 'Amélioration du tri des rappels',
    pt: 'Melhoramento da ordenação dos lembretes',
  },
  {
    test: /(automatically|auto|start).*service|service.*(start|auto)/i,
    cat: 'feature',
    en: 'Recommended services are now created automatically when adding a car',
    ar: 'إنشاء الخدمات الموصى بها تلقائياً عند إضافة سيارة',
    es: 'Los servicios recomendados se crean automáticamente al añadir un coche',
    fr: "Création automatique des services recommandés lors de l'ajout d'une voiture",
    pt: 'Criação automática dos serviços recomendados ao adicionar um carro',
  },
  {
    test: /navigation|navigate/i,
    cat: 'update',
    en: 'Improved app navigation',
    ar: 'تحسين التنقل في التطبيق',
    es: 'Se mejoró la navegación de la aplicación',
    fr: "Amélioration de la navigation dans l'application",
    pt: 'Melhoramento da navegação da aplicação',
  },
  {
    test: /ads?\sloader|reward|admob/i,
    cat: 'update',
    en: 'Improved ads',
    ar: 'تحسين الإعلانات',
    es: 'Se mejoraron los anuncios',
    fr: 'Amélioration des publicités',
    pt: 'Melhoramento dos anúncios',
  },
  {
    test: /privacy|ump|consent|gdpr/i,
    cat: 'feature',
    en: 'Added ad privacy settings',
    ar: 'إضافة إعدادات خصوصية الإعلانات',
    es: 'Se añadieron ajustes de privacidad de anuncios',
    fr: 'Ajout des paramètres de confidentialité des publicités',
    pt: 'Adição das definições de privacidade dos anúncios',
  },
{
    test: /year.*valid|valid.*year|year valid/i,
    cat: 'feature',
    en: 'Added year validation',
    ar: 'إضافة التحقق من السنة',
    es: 'Se añadió la validación del año',
    fr: "Ajout de la validation de l'année",
    pt: 'Adição da validação do ano',
  },
  {
    test: /storage|data.*(fix|correc)|(fix|correc).*data/i,
    cat: 'fix',
    en: 'Fixed data storage',
    ar: 'إصلاح تخزين البيانات',
    es: 'Se corrigió el almacenamiento de datos',
    fr: 'Correction du stockage des données',
    pt: 'Correção do armazenamento de dados',
  },
  {
    test: /delete.*dashboard|dashboard.*delete/i,
    cat: 'update',
    en: 'Removed the delete action from the Dashboard',
    ar: 'إزالة زر الحذف من لوحة التحكم',
    es: 'Se eliminó la acción de borrar del panel',
    fr: "Suppression de l'action de suppression du tableau de bord",
    pt: 'Remoção da ação de eliminar do painel',
  },
  {
    test: /spacing|font size|font-size|icons? color|color/i,
    cat: 'update',
    en: 'Improved icons and layout details',
    ar: 'تحسين الأيقونات وتفاصيل التصميم',
    es: 'Se mejoraron los iconos y detalles de diseño',
    fr: 'Amélioration des icônes et des détails de mise en page',
    pt: 'Melhoramento dos ícones e detalhes de design',
  },
  {
    test: /dashboard.*ui|improved? dashboard|better dashboard/i,
    cat: 'update',
    en: 'Improved the Dashboard design',
    ar: 'تحسين تصميم لوحة التحكم',
    es: 'Se mejoró el diseño del panel',
    fr: 'Amélioration du design du tableau de bord',
    pt: 'Melhoramento do design do painel',
  },
  {
    test: /spelling|typo|texte|text/i,
    cat: 'fix',
    en: 'Fixed text and spelling',
    ar: 'إصلاح النصوص والإملاء',
    es: 'Se corrigieron textos y ortografía',
    fr: "Correction des textes et de l'orthographe",
    pt: 'Correção de textos e ortografia',
  },
];
// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
function cleanSubject(subject) {
  return subject
    .replace(/[.#,;\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Commit -> bullets
// ---------------------------------------------------------------------------
const VERB_RE = /\b(add(?:ed|ing)?|fix(?:ed|es)?|correct(?:ed)?|update(?:d)?|remove(?:d)?|improve(?:d)?|support|start|adjust(?:ed)?|change(?:ed)?|translat(?:ed)?|sort(?:ed)?|bump(?:ed)?)\b/i;

/** Split compound subjects like "added backup & fixed audi engines". */
function splitActions(subject) {
  const parts = subject.split(/\s+(?:&|\+|\band\b)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => VERB_RE.test(p))) {
    return parts;
  }
  return [subject];
}

function makeBullets(make, verb) {
  const frames = {
    add: {
      en: 'Added ' + make + ' models and engine data',
      ar: 'إضافة سيارات ومحركات ' + make,
      es: 'Se añadieron modelos y motores de ' + make,
      fr: 'Ajout des modèles et des moteurs ' + make,
      pt: 'Adição de modelos e motores ' + make,
    },
    fix: {
      en: 'Fixed ' + make + ' data',
      ar: 'إصلاح بيانات ' + make,
      es: 'Se corrigieron los datos de ' + make,
      fr: 'Correction des données ' + make,
      pt: 'Correção dos dados ' + make,
    },
    update: {
      en: 'Updated ' + make + ' engine data',
      ar: 'تحديث بيانات محركات ' + make,
      es: 'Actualización de los datos de motores ' + make,
      fr: 'Mise à jour des données des moteurs ' + make,
      pt: 'Atualização dos dados dos motores ' + make,
    },
    remove: {
      en: 'Removed duplicate data for ' + make,
      ar: 'إزالة البيانات المكررة لـ ' + make,
      es: 'Se eliminaron los datos duplicados de ' + make,
      fr: 'Suppression des données en double pour ' + make,
      pt: 'Remoção de dados duplicados de ' + make,
    },
  };
  return frames[verb] || frames.update;
}

function fallbackBullets(subject, verb) {
  const frames = {
    add: {
      en: 'Added ' + subject,
      ar: 'تمت إضافة ' + subject,
      es: 'Se añadió ' + subject,
      fr: 'Ajout de ' + subject,
      pt: 'Adição de ' + subject,
    },
    fix: {
      en: 'Fixed ' + subject,
      ar: 'تم إصلاح ' + subject,
      es: 'Se corrigió ' + subject,
      fr: 'Correction de ' + subject,
      pt: 'Correção de ' + subject,
    },
    update: {
      en: 'Updated ' + subject,
      ar: 'تم تحديث ' + subject,
      es: 'Se actualizó ' + subject,
      fr: 'Mise à jour de ' + subject,
      pt: 'Atualização de ' + subject,
    },
    remove: {
      en: 'Removed ' + subject,
      ar: 'تمت إزالة ' + subject,
      es: 'Se eliminó ' + subject,
      fr: 'Suppression de ' + subject,
      pt: 'Remoção de ' + subject,
    },
    fixData: {
      en: 'Fixed car data',
      ar: 'تم إصلاح بيانات السيارات',
      es: 'Se corrigieron los datos de coches',
      fr: 'Correction des données des voitures',
      pt: 'Correção dos dados dos carros',
    },
  };
  return frames[verb] || frames.update;
}

/** Turn a single (possibly compound) commit subject into localized bullets. */
function subjectToBullets(subject, makes) {
  const results = [];
  const parts = splitActions(subject);
  for (const part of parts) {
    const clean = cleanSubject(part);
    const make = findMake(clean, makes);
    if (make) {
      const cls = classify(clean);
      results.push({ raw: clean, make, ...makeBullets(make, cls.verb) });
      continue;
    }
    let matched = null;
    for (const phrase of KNOWN_PHRASES) {
      if (phrase.test.test(clean)) {
        matched = phrase;
        break;
      }
    }
    if (matched) {
      results.push({
        raw: clean,
        en: matched.en,
        ar: matched.ar,
        es: matched.es,
        fr: matched.fr,
        pt: matched.pt,
        category: matched.cat,
      });
    } else {
      const cls = classify(clean);
      const fb = fallbackBullets(capitalize(clean), cls.verb);
      results.push({ raw: clean, ...fb, category: cls.cat, fallback: true });
    }
  }
  return results;
}

const MODEL_TO_MAKE = {
  micra: 'Nissan', clio: 'Renault', megane: 'Renault', logan: 'Dacia',
  swift: 'Suzuki', vitara: 'Suzuki', '206': 'Peugeot', '208': 'Peugeot',
  '308': 'Peugeot', '508': 'Peugeot', golf: 'Volkswagen', polo: 'Volkswagen',
  corolla: 'Toyota', yaris: 'Toyota', civic: 'Honda', duster: 'Dacia',
  sandero: 'Dacia', i20: 'Hyundai', elantra: 'Hyundai',
};

function findMake(subject, makes) {
  const lower = subject.toLowerCase();
  const hit = makes.find((m) => m.length > 2 && lower.includes(m.toLowerCase()));
  if (hit) return hit;
  for (const model of Object.keys(MODEL_TO_MAKE)) {
    if (new RegExp('(^|[^a-z])' + escRegex(model.toLowerCase()) + '([^a-z]|$)', 'i').test(lower)) {
      return MODEL_TO_MAKE[model];
    }
  }
  return null;
}

function classify(subject) {
  const s = subject.toLowerCase();
  const isFix = /\b(fix(?:ed|es)?|correct(?:ed)?|repair|resolv|improv)\b/.test(s);
  const isAdd = /\b(add(?:ed|ing)?|new|support|create|introduc|implement|start)\b/.test(s);
  const isUpdate = /\b(update(?:d)?|change(?:d)?|replace|migrat|upgrade|adjust(?:ed)?|sort(?:ed)?)\b/.test(s);
  const isRemove = /\b(remove(?:d)?|delete(?:d)?)\b/.test(s);
  const isData = /engine|model|make|car|vehicle|spec|data|config|wmi|vin|fuel|oil/.test(s);
  if (isFix && (isData || /micra|clio|swift|206/.test(s))) return { verb: 'fixData', cat: 'data' };
  if (isFix) return { verb: 'fix', cat: isData ? 'data' : 'fix' };
  if (isRemove) return { verb: 'remove', cat: isData ? 'data' : 'update' };
  if (isAdd) return { verb: 'add', cat: isData ? 'data' : 'feature' };
  if (isUpdate) return { verb: 'update', cat: isData ? 'data' : 'update' };
  return { verb: 'update', cat: isData ? 'data' : 'update' };
}
// ---------------------------------------------------------------------------
// Commit collection
// ---------------------------------------------------------------------------
function collectCommits(rangeStart, rangeEnd) {
  const r = git(['log', '--format=%H%x09%ad%x09%s', '--date=short', rangeStart + '..' + rangeEnd]);
  if (!r.ok) {
    console.error('git log failed: ' + r.stderr);
    process.exit(1);
  }
  const commits = [];
  for (const line of r.stdout.split('\n').filter(Boolean)) {
    const [hash, date, ...rest] = line.split('\t');
    const subject = rest.join('\t');
    const paths = getChangedPaths(hash);
    if (isInfraCommit(subject, paths)) continue;
    commits.push({ hash, date, subject, paths });
  }
  commits.reverse(); // chronological
  return commits;
}

const LOCALE_TEMPLATES = {
  'en-US': { header: (v) => '🚗 V' + v + ' Release', sub: 'Features included in this release:' },
  ar: { header: (v) => '🚗 V' + v + ' Release', sub: 'الميزات المدرجة في هذا الإصدار:' },
  'es-ES': { header: (v) => '🚗 V' + v + ' Release:', sub: null },
  'fr-FR': { header: (v) => '🚗 V' + v + ' Release', sub: 'Fonctionnalités incluses dans cette version :' },
  'pt-PT': { header: (v) => '🚗 V' + v + ' Release:', sub: null },
};

function buildNotes(versionName, bulletsByLocale) {
  const out = ['Release notes;'];
  for (const loc of LOCALES) {
    const tpl = LOCALE_TEMPLATES[loc];
    const lines = bulletsByLocale[loc] || [];
    out.push('<' + loc + '>');
    out.push(tpl.header(versionName));
    if (tpl.sub) out.push(tpl.sub);
    for (const b of lines) out.push('• ' + b);
    out.push('</' + loc + '>');
  }
  return out.join('\n');
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  const version = readVersion(cli);
  const makes = loadMakes();

  let rangeStart = cli.from;
  if (!rangeStart && !cli.all) {
    const prev = findPrevBump(version.versionCode);
    rangeStart = prev ? prev.hash : null;
  }
  const rangeEnd = cli.to || 'HEAD';

  let commits = [];
  if (cli.all || !rangeStart) {
    const r = git(['rev-list', '--max-parents=0', 'HEAD']);
    const root = r.ok && r.stdout ? r.stdout.split('\n')[0] : null;
    if (root) commits = collectCommits(root, rangeEnd);
  } else {
    commits = collectCommits(rangeStart, rangeEnd);
  }

  const bullets = { 'en-US': [], ar: [], 'es-ES': [], 'fr-FR': [], 'pt-PT': [] };
  const items = [];
  for (const c of commits) {
    const bs = subjectToBullets(c.subject, makes);
    for (const b of bs) {
      items.push({ hash: c.hash, date: c.date, subject: c.subject, ...b });
      for (const loc of LOCALES) bullets[loc].push(b[LOCALE_KEY[loc]]);
    }
  }

  const json = {
    versionCode: version.versionCode,
    versionName: version.versionName,
    range: { from: rangeStart || '(root)', to: rangeEnd, count: commits.length },
    items,
    notes: bullets,
    draft: buildNotes(version.versionName, bullets),
  };

  if (cli.json) {
    process.stdout.write(JSON.stringify(json, null, 2) + '\n');
    return;
  }

  const totalBullets = bullets['en-US'].length;
  const perLocale = LOCALES.map((l) => l + '=' + bullets[l].length).join('  ');
  console.error('Car Service Reminder release notes generator');
  console.error('Version: ' + version.versionName + ' (code ' + version.versionCode + ')');
  console.error('Range: ' + (rangeStart || 'root') + '..' + rangeEnd + '  (' + commits.length + ' user-facing commits)');
  console.error('Bullets: ' + perLocale);
  if (totalBullets === 0) {
    console.error('WARNING: no user-facing commits found in this range. ' +
      'Check --from / --to or use --all. The draft below is empty.');
  }
  console.error('---');

  const final = buildNotes(version.versionName, bullets);
  if (cli.output) {
    const file = path.resolve(REPO_ROOT, cli.output);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, final + '\n', 'utf8');
    console.error('Written to ' + file);
  } else {
    process.stdout.write(final + '\n');
  }
}

main();