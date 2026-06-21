UUID = widgy@anorak.example.com
EXTENSION_DIR = ~/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all zip install uninstall clean

all: zip

zip:
	zip -r $(UUID).zip . -x "*.git*" "*~" "#*#" "*.swp" "*.DS_Store" "__MACOSX"

install: zip
	mkdir -p $(EXTENSION_DIR)
	unzip -o $(UUID).zip -d $(EXTENSION_DIR)
	gnome-extensions enable $(UUID)
	@echo "Extension installed and enabled."

uninstall:
	gnome-extensions disable $(UUID)
	rm -rf $(EXTENSION_DIR)
	@echo "Extension removed."

clean:
	rm -f $(UUID).zip