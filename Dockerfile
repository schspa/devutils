FROM ubuntu:18.04

RUN apt-get update -qq -y && \
    apt-get install -y  \
            locales python3-pip \
            python3-dev \
            python3-setuptools \
            gcc binutils \
            --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

EXPOSE 5000

WORKDIR /app

COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY . /app

ENTRYPOINT [ "bash" ]

CMD [ "./start.sh" ]
