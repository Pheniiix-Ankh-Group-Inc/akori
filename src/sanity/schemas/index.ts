import { type SchemaTypeDefinition } from 'sanity'
import { evenement   } from "./evenement"
import { ressource   } from "./ressource"
import { partenaire  } from "./partenaire"
import { membreEquipe } from "./membreEquipe"

export const schema = {
  types: [evenement, ressource, partenaire, membreEquipe],
}
