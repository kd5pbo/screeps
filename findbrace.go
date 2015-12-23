package main

import (
	"fmt"
	"io/ioutil"
	"os"
)

func main() {
	for _, v := range os.Args[1:len(os.Args)] {
		c, err := ioutil.ReadFile(v)
		if nil != err {
			fmt.Fprintf(
				os.Stderr,
				"Unable to read %v: %v",
				v,
				err,
			)
			continue
		}
		l := 0
		r := 0
		for _, b := range c {
			if '{' == b {
				l++
			}
			if '}' == b {
				r++
			}
		}
		fmt.Printf("%v: %v {'s, %v }'s\n", v, l, r)
	}
}
