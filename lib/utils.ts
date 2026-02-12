import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fonction pour convertir le markdown simple en HTML
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""
  
  let html = markdown
  
  // Convertir **texte** en <strong>texte</strong> (gérer les cas multiples)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Convertir les listes à puces (-) en <ul><li>
  const lines = html.split('\n')
  let inList = false
  let result: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Détecter une ligne de liste (peut commencer par des espaces)
    if (/^\s*-\s+/.test(trimmedLine)) {
      if (!inList) {
        result.push('<ul class="list-disc list-inside space-y-1 my-2">')
        inList = true
      }
      const content = trimmedLine.replace(/^\s*-\s+/, '')
      result.push(`<li class="ml-2">${content}</li>`)
    } else {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      if (trimmedLine) {
        // Vérifier si c'est un titre (ligne avec seulement du gras)
        if (trimmedLine.startsWith('<strong>') && trimmedLine.endsWith('</strong>') && trimmedLine.length < 100) {
          result.push(`<h3 class="font-bold text-base mt-4 mb-2 text-slate-900">${trimmedLine}</h3>`)
        } else {
          result.push(`<p class="mb-2">${trimmedLine}</p>`)
        }
      } else if (i < lines.length - 1) {
        // Ne pas ajouter de <br> à la fin
        result.push('<br>')
      }
    }
  }
  
  if (inList) {
    result.push('</ul>')
  }
  
  return result.join('\n')
}
