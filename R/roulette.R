#' Insert Roulette
#' @export
insert_roulette <- function(yaml_path, id, height = "400px") {
    # 1. Load Data
    roulette_data <- yaml::read_yaml(yaml_path)
    
    if (is.null(roulette_data[[id]])) {
      return(htmltools::div(style="color:red", paste("Error: ID", id, "not found.")))
    }
    
    album <- roulette_data[[id]]
    images <- album$images

    images <- lapply(images, function(img) {
      raw_text <- if (!is.null(img$caption)) img$caption else img$title
      
      if (!is.null(raw_text)) {
        html_caption <- commonmark::markdown_html(raw_text)
        # Uncomment this line to strip the <p> tags!
        img$caption <- gsub("^<p>|</p>\n$", "", html_caption) 
      }
      return(img)
    })
    
    # 2. Prepare Data for JS
    json_data <- jsonlite::toJSON(images, auto_unbox = TRUE)
    
    # 3. Create the Dependency
    roulette_dep <- htmltools::htmlDependency(
      name = "roulette-module",
      version = "1.1.0",
      src = c(file = system.file("roulette", package = "ALONGate_Project")),
      script = "roulette.js"
    )
    
    # 4. Create Structure using <figure> and <figcaption>
    html_content <- htmltools::tags$figure(
      id = paste0("roulette-", id),
      class = "roulette-container",
      style = "margin: 0; padding: 0;", # Prevent default figure indentation
      `data-images` = json_data,
      
      htmltools::div(
        class = "roulette-stage",
        style = paste0("height: ", height, "; position: relative; width: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; box-sizing: border-box;")
      ),

      htmltools::tags$a(
        href = images[[1]]$url,
        class = "lightbox",
        style = "display: none;",
        "dummy"
      ),
      
      htmltools::div(
        class = "roulette-thumbnails",
        style = if (length(images) < 4) "display: flex; justify-content: center;" else "",
        htmltools::div(class = "r-track") 
      ),
      
      # Add the style argument here to center the text
      htmltools::tags$figcaption(
        class = "roulette-caption",
        # Added width: 100% and explicitly centered both the figure and inner div
        style = "text-align: center; margin-top: 10px; width: 100%;", 
        htmltools::div(
          class = "caption-text", 
          style = "text-align: center; margin: 0 auto;", 
          htmltools::HTML(images[[1]]$caption)
        )
      )
    )
    
    return(htmltools::tagList(html_content, roulette_dep))
}