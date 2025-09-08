export type CodeApplyReplacement = {
   target: string
   replacement: string
}

/**
 * CodeApplyExecutor
 * -----------------
 * Utility for applying an array of textual replacements (usually returned by the
 * backend) to a given source string.
 *
 * Each replacement is applied sequentially (in the order provided).  All
 * occurrences of `old_code` within the ever-evolving source are substituted by
 * `new_code`.  We purposefully avoid using `String.prototype.replace` with
 * regular expressions to ensure literal matching and to dodge any unwanted
 * regexp special-character semantics.  Instead, we rely on `split/join`, which
 * treats the search string literally.
 */
export class CodeApplyExecutor {
   /**
    * Apply a list of replacements to the given source string.
    *
    * @param source       The original source code.
    * @param replacements The list of { target, replacement } replacements.
    * @returns            The transformed source code.
    */
   static apply(source: string, replacements: CodeApplyReplacement[]): string {
      let updated = source
      for (const { target, replacement } of replacements) {
         if (!target) continue
         updated = updated.split(target).join(replacement)
      }
      return updated
   }
}
