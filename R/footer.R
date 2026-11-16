#' Insert Footer with Editor and Dynamic Back Button
#' @export
insert_footer <- function() {
  # 1. Extract the editor from YAML metadata
  editors <- rmarkdown::metadata$page_editors
  
  editor_text <- ""
  if (!is.null(editors)) {
    # Extract the 'name' field from each editor in the YAML list
    editor_names <- sapply(editors, function(x) x$name)
    editor_text <- paste0("**Editor:** ", paste(editor_names, collapse = ", "))
  }
  
  # 2. Determine the dynamic Back Button path
  current_file <- knitr::current_input(dir = TRUE)
  
  if (!is.null(current_file)) {
    path_parts <- strsplit(current_file, "/")[[1]]
    
    # Locate "chapter" and discard everything before it
    chapter_idx <- match("chapter", path_parts)
    
    if (!is.na(chapter_idx)) {
      path_parts <- path_parts[chapter_idx:length(path_parts)]
      
      # Rule A: File is a direct child of a chapter subfolder (length == 3)
      # Example: c("chapter", "project", "team.qmd")
      if (length(path_parts) == 3) {
        back_link <- "../../index.qmd"
        
      # Rule B: File is inside a nested folder (length > 3)
      # Example: c("chapter", "project", "team", "zhehao_hu.qmd")
      } else if (length(path_parts) > 3) {
        parent_folder <- path_parts[length(path_parts) - 1]
        back_link <- paste0("../", parent_folder, ".qmd")
      }
    }
  }
  
  # 3. Output the result using cat()
  cat("<hr>\n\n")
  
  if (editor_text != "") {
    cat(editor_text, "\n\n")
  }
  
  # Output a Markdown link with Bootstrap button classes.
  # Using a Markdown link allows Quarto to automatically convert the .qmd extension to .html
  cat(sprintf("[&#8592; Back](%s){.btn .btn-outline-primary role='button'}\n", back_link))
}