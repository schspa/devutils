SRCPATH := $(CURDIR)
ENTRYPOINT := $(shell find $(SRCPATH) -name '*.ini')
PROJECTNAME := $(shell basename "${PWD}")

define HELP
Manage $(PROJECTNAME).

Usage:

make update-xmls.    - Update xmls from arm website.
make run             - Run uWSGI server for $(PROJECTNAME).
make restart         - Purge cache & reinstall modules.
make update          - Update npm production dependencies.
make clean           - Remove cached files.
endef
export HELP

.PHONY: run restart update help

# https://developer.arm.com/-/media/developer/products/architecture/armv8-a-architecture/2020-09/SysReg_xml_v87A-2020-09.tar.gz
xmls = 2020-09/SysReg_xml_v87A-2020-09.tar.gz

.asserts/%.tar.gz:
	@echo $%
	mkdir -p $(dir $@)
	curl https://developer.arm.com/-/media/developer/products/architecture/armv8-a-architecture/$(subst .asserts/,,$@) --output $@

.PHONY: update-xmls
update-xmls: $(addprefix .asserts/,$(xmls))
	mkdir -p ./devutils/static/arm-asl
	find .asserts -name '*.tar.gz' -exec tar -xzvf {} -C ./devutils/static/arm-asl \;

./devutils/static/arm-asl/asl.xml: update-xmls
	echo "generate asl summary xml"
	python3 devutils/script/create-asl-summary.py

.PHONY: asl
asl: ./devutils/static/arm-asl/asl.xml

all help:
	@echo "$$HELP"

.PHONY: run
run:
	nohup uwsgi $(ENTRYPOINT) &

.PHONY: restart
restart:
	pkill -9 -f $(shell uwsgi $(ENTRYPOINT))
	nohup uwsgi $(ENTRYPOINT) &

.PHONY: update
update:
	git pull origin master
	pkill -9 -f $(shell uwsgi $(ENTRYPOINT))
	poetry shell
	poetry update
	nohup uwsgi $(ENTRYPOINT) &

.PHONY: clean
clean:
	find . -name '*.pyc' -delete
	find . -name '__pycache__' -delete
	rm -rf .asserts
