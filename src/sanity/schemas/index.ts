import { type SchemaTypeDefinition } from 'sanity'
import { evenement   } from "./evenement"
import { ressource   } from "./ressource"
import { partenaire  } from "./partenaire"

export const schema = {
  types: [evenement, ressource, partenaire],
}
