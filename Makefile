UUID = widgy@anorak.example.com
EXTENSION_DIR = ~/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all zip install uninstall clean

all: zip

zip:
	zip -r $(UUID).zip . -x "*.git*" "*~" "#*#" "*.swp" "*.DS_Store" "__MACOSX" "*.zip"

install: zip
	# Clean up any existing installation directory to prevent conflicts
	rm -rf $(EXTENSION_DIR)
	mkdir -p $(EXTENSION_DIR)
	unzip -o $(UUID).zip -d $(EXTENSION_DIR)
	# Compile schemas in the installed location
	glib-compile-schemas $(EXTENSION_DIR)/schemas/
	# Enable the extension (might require restarting Shell or logging out/in to take effect)
	-gnome-extensions enable $(UUID)
	@echo "Extension installed, schemas compiled, and extension enabled."

uninstall:
	-gnome-extensions disable $(UUID)
	rm -rf $(EXTENSION_DIR)
	@echo "Extension removed."

clean:
	rm -f $(UUID).zip