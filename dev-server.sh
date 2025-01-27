cd build/client
docker run --rm -it -p 3000:80 -v .:/public joseluisq/static-web-server:2
