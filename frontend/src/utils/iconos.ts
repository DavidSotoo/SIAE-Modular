// Iconos SVG en linea (Lucide, licencia ISC). Sustituyen a la fuente Material
// Symbols, que se descargaba de Google Fonts y mostraba el nombre del icono
// ("search", "close") como texto mientras cargaba.
//
// Las claves conservan los nombres de Material que ya usaban las vistas y los
// mapas de estado, para no tener que renombrarlos en cada sitio.
import {
  ArrowLeft,
  Ban,
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleX,
  Clock,
  CloudOff,
  Code,
  Compass,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  FolderKanban,
  FolderX,
  GraduationCap,
  Hourglass,
  IdCard,
  Info,
  Link,
  LogOut,
  Mail,
  Menu,
  Moon,
  NotebookPen,
  Pencil,
  Plus,
  Save,
  Search,
  SearchX,
  Shapes,
  ShieldCheck,
  Sun,
  Tag,
  TriangleAlert,
  User,
  UserSearch,
  Users,
  Check,
  X,
} from 'lucide-static';

const SVG_POR_NOMBRE = {
  add: Plus,
  admin_panel_settings: ShieldCheck,
  arrow_back: ArrowLeft,
  badge: IdCard,
  block: Ban,
  cancel: CircleX,
  category: Shapes,
  check: Check,
  check_circle: CircleCheck,
  close: X,
  cloud_off: CloudOff,
  code: Code,
  dark_mode: Moon,
  description: FileText,
  download: Download,
  edit: Pencil,
  edit_note: NotebookPen,
  error: CircleAlert,
  explore_off: Compass,
  folder_managed: FolderKanban,
  folder_off: FolderX,
  group: Users,
  group_search: UserSearch,
  hourglass_top: Hourglass,
  info: Info,
  label: Tag,
  light_mode: Sun,
  link: Link,
  logout: LogOut,
  mail: Mail,
  menu: Menu,
  open_in_new: ExternalLink,
  person: User,
  person_search: UserSearch,
  save: Save,
  schedule: Clock,
  school: GraduationCap,
  search: Search,
  search_off: SearchX,
  supervisor_account: Users,
  task_alt: CircleCheckBig,
  upload_file: FileUp,
  verified: BadgeCheck,
  warning: TriangleAlert,
} as const;

export type NombreIcono = keyof typeof SVG_POR_NOMBRE;

/**
 * HTML de un icono decorativo. Mide 1em, asi que toma el tamano de letra de
 * su contenedor (o el que le de el CSS a `.icono`), y hereda el color.
 * Siempre va oculto para lectores de pantalla: el texto vecino o el
 * aria-label del boton es quien dice que hace.
 */
export function icono(nombre: NombreIcono, clase = ''): string {
  const clases = clase ? `icono ${clase}` : 'icono';
  return SVG_POR_NOMBRE[nombre]
    .trim()
    .replace(/class="[^"]*"/, `class="${clases}" aria-hidden="true" focusable="false"`)
    .replace('width="24"', 'width="1em"')
    .replace('height="24"', 'height="1em"');
}
