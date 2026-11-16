// assets/js/roulette.js

class ImageRoulette {
	constructor(element) {
		this.container = element;
		this.images = JSON.parse(element.dataset.images);
		this.currentIndex = 0;

		// Static mode flag for short galleries
		this.isStatic = this.images.length < 4;

		const stage = element.querySelector(".roulette-stage");

		// --- Lightbox Integration ---
		stage.style.cursor = "zoom-in";
		stage.addEventListener("click", () => {
			const currentData = this.images[this.currentIndex];

			// Detect how Quarto exposed the library
			const Lbox =
				typeof GLightbox !== "undefined"
					? GLightbox
					: typeof glightbox !== "undefined"
						? glightbox
						: null;

			if (Lbox) {
				const lightbox = Lbox({
					elements: [
						{
							href: currentData.url,
							type: "image",
							description:
								currentData.caption || currentData.title || "",
						},
					],
				});
				lightbox.open();
			} else {
				window.open(currentData.url, "_blank");
			}
		});
		// -----------------------------

		// Force object-fit contain and 100% sizing to handle all aspect ratios without cropping
		// Force block display and box-sizing to eliminate baseline descender ghost spacing
		this.imgA = document.createElement("img");
		this.imgA.className = "roulette-main-img visible";
		this.imgA.style.cssText =
			"position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; object-fit: contain; box-sizing: border-box; margin: 0; padding: 0; transition: opacity 0.3s ease; opacity: 1;";
		this.imgA.src = this.images[0].url;

		this.imgB = document.createElement("img");
		this.imgB.className = "roulette-main-img";
		this.imgB.style.cssText =
			"position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; object-fit: contain; box-sizing: border-box; margin: 0; padding: 0; transition: opacity 0.3s ease; opacity: 0;";

		stage.appendChild(this.imgB);
		stage.appendChild(this.imgA);

		this.activeImgElement = this.imgA;
		this.nextImgElement = this.imgB;

		this.captionText = element.querySelector(".caption-text");
		this.thumbWrapper = element.querySelector(".roulette-thumbnails");

		this.track = element.querySelector(".r-track");
		if (!this.track) {
			this.track = document.createElement("div");
			this.track.className = "r-track";
			this.thumbWrapper.appendChild(this.track);
		}

		// Apply static layout overrides if there aren't enough images to spin
		if (this.isStatic) {
			this.track.style.display = "flex";
			this.track.style.justifyContent = "center";
			this.track.style.gap = "15px";
			this.track.style.transform = "none";
		}

		this.isAnimating = false;
		this.currentTrackX = 0;
		this.peekWidth = 0;

		this.isDragging = false;
		this.hasDragged = false; // Differentiates a drag from a click
		this.dragStartX = 0;
		this.dragCurrentX = 0;
		this.scrollCooldown = false;

		this.init();
	}

	init() {
		// Build 1x list for static, 3x list for infinite roulette
		const sets = this.isStatic
			? [this.images]
			: [this.images, this.images, this.images];

		sets.flat().forEach((imgData, index) => {
			let thumb = document.createElement("img");
			thumb.src = imgData.url;
			thumb.className = "r-thumb";
			thumb.style.cursor = "pointer";
			thumb.ondragstart = () => false;

			thumb.addEventListener("click", (e) => {
				if (this.hasDragged) return; // Block click if user was swiping

				if (this.isStatic) {
					this.currentIndex = index;
					this.updateMainDisplay();
					this.highlightThumbnail(index);
				} else {
					// Restore transition just in case a previous interaction cleared it
					this.track.style.transition = "";
					this.jumpToTrackIndex(index);
				}
			});

			this.track.appendChild(thumb);
		});

		if (this.isStatic) {
			this.highlightThumbnail(0);
		} else {
			const startTrackIndex = this.images.length;
			const peekStyle = getComputedStyle(this.container).getPropertyValue(
				"--r-thumb-peek",
			);
			this.peekWidth = parseInt(peekStyle) || 50;

			setTimeout(() => {
				this.highlightThumbnail(startTrackIndex);
				this.alignTrack(false);
				this.setupInteractions();
			}, 100);

			window.addEventListener("resize", () => this.alignTrack(false));
		}
	}

	setupInteractions() {
		this.thumbWrapper.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				if (this.isAnimating || this.scrollCooldown) return;

				if (Math.abs(e.deltaY) > 10 || Math.abs(e.deltaX) > 10) {
					const direction = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
					this.navigate(direction);
					this.scrollCooldown = true;
					setTimeout(() => (this.scrollCooldown = false), 150);
				}
			},
			{ passive: false },
		);

		this.thumbWrapper.addEventListener(
			"pointerdown",
			this.onPointerDown.bind(this),
		);
		this.thumbWrapper.addEventListener(
			"pointermove",
			this.onPointerMove.bind(this),
		);
		this.thumbWrapper.addEventListener(
			"pointerup",
			this.onPointerUp.bind(this),
		);
		this.thumbWrapper.addEventListener(
			"pointerleave",
			this.onPointerUp.bind(this),
		);
	}

	onPointerDown(e) {
		if (this.isAnimating) return;
		this.isDragging = true;
		this.hasDragged = false; // Reset on down
		this.dragStartX = e.clientX;
		this.dragCurrentX = this.currentTrackX;

		this.track.style.transition = "none";
		this.thumbWrapper.style.cursor = "grabbing";
	}

	onPointerMove(e) {
		if (!this.isDragging) return;

		const diff = e.clientX - this.dragStartX;

		// If moved more than 5px, it's a drag, not a tap
		if (Math.abs(diff) > 5) {
			this.hasDragged = true;
		}

		this.track.style.transform = `translateX(${this.dragCurrentX + diff}px)`;
	}

	onPointerUp(e) {
		if (!this.isDragging) return;
		this.isDragging = false;
		this.thumbWrapper.style.cursor = "";

		const diff = e.clientX - this.dragStartX;
		const threshold = 50;

		if (diff < -threshold) {
			this.navigate(1);
		} else if (diff > threshold) {
			this.navigate(-1);
		} else {
			this.track.style.transition = "";
			this.alignTrack(true);
		}
	}

	navigate(direction) {
		if (this.isAnimating) return;

		const len = this.images.length;
		this.currentIndex = (this.currentIndex + direction + len) % len;

		this.updateMainDisplay();
		this.slideTrack(direction);
	}

	jumpToTrackIndex(trackIndex) {
		const currentTrackIndex = this.getCurrentTrackIndex();
		if (trackIndex === currentTrackIndex) return;

		// Calculate the absolute underlying image index directly from the track position
		this.currentIndex = trackIndex % this.images.length;

		this.updateMainDisplay();

		this.isAnimating = true;
		this.highlightThumbnail(trackIndex);
		this.alignTrack(true);
		this.cleanupLoop(trackIndex);
	}

	getCurrentTrackIndex() {
		const thumbs = Array.from(this.track.children);
		return thumbs.findIndex((t) => t.classList.contains("active"));
	}

	slideTrack(direction) {
		this.isAnimating = true;
		const currentTrackIndex = this.getCurrentTrackIndex();
		const nextTrackIndex = currentTrackIndex + direction;

		this.highlightThumbnail(nextTrackIndex);
		this.track.style.transition = "";
		this.alignTrack(true);
		this.cleanupLoop(nextTrackIndex);
	}

	cleanupLoop(targetIndex) {
		const transitionDuration = getComputedStyle(
			this.track,
		).transitionDuration;
		const ms = parseFloat(transitionDuration) * 1000 || 600;

		setTimeout(() => {
			const len = this.images.length;
			let newIndex = targetIndex;
			let didTeleport = false;

			if (targetIndex < len) {
				newIndex = targetIndex + len;
				didTeleport = true;
			} else if (targetIndex >= len * 2) {
				newIndex = targetIndex - len;
				didTeleport = true;
			}

			if (didTeleport) {
				this.highlightThumbnail(newIndex);
				this.alignTrack(false);
			}

			this.isAnimating = false;
		}, ms);
	}

	highlightThumbnail(index) {
		const thumbs = Array.from(this.track.children);
		thumbs.forEach((t) => t.classList.remove("active"));
		if (thumbs[index]) thumbs[index].classList.add("active");
	}

	alignTrack(animate) {
		const activeThumb = this.track.querySelector(".active");
		if (!activeThumb) return;

		if (animate === false) {
			this.track.style.transition = "none";
		}

		const thumbLeft = activeThumb.offsetLeft;
		const targetX = -(thumbLeft - this.peekWidth);

		this.currentTrackX = targetX;
		this.track.style.transform = `translateX(${targetX}px)`;

		if (!animate) void this.track.offsetWidth;
	}

	updateMainDisplay() {
		const currentData = this.images[this.currentIndex];
		const imgToLoad = this.nextImgElement;
		const imgToHide = this.activeImgElement;

		imgToLoad.src = currentData.url;

		const reveal = () => {
			imgToLoad.style.opacity = "1";
			imgToHide.style.opacity = "0";
			imgToLoad.classList.add("visible");
			imgToHide.classList.remove("visible");

			this.captionText.classList.add("fade-text");
			setTimeout(() => {
				this.captionText.innerHTML =
					currentData.caption || currentData.title || "";
				this.captionText.classList.remove("fade-text");
			}, 200);

			this.activeImgElement = imgToLoad;
			this.nextImgElement = imgToHide;
		};

		if (imgToLoad.complete) reveal();
		else imgToLoad.onload = reveal;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const roulettes = document.querySelectorAll(".roulette-container");
	roulettes.forEach((el) => new ImageRoulette(el));
});
