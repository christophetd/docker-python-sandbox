set -e
javac "$1"
find . -name "*.class" | sed -e 's/\.class//' -e 's/\.\///' | xargs java