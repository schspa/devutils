FROM ubuntu:18.04

RUN apt-get update -qq -y && \
    apt-get install -y  locales python3-pip python3-dev python3-setuptools gcc binutils --no-install-recommends

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app

COPY . /app

RUN pip3 install -i https://mirrors.ustc.edu.cn/pypi/web/simple pip -U
RUN pip3 config set global.index-url https://mirrors.ustc.edu.cn/pypi/web/simple

RUN pip3 install -r requirements.txt

EXPOSE 5000

COPY . /app

ENTRYPOINT [ "bash" ]

CMD [ "./start.sh" ]
